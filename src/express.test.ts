import { describe, it, expect } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow } from "./policy-builder.js";
import { guard } from "./middleware/express.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "member" | "viewer";
  resources: "invoice" | "project";
  actions: "invoice:create" | "invoice:read" | "invoice:approve" | "project:read";
}

const schema: TestSchema = {} as TestSchema;

function createMockReqRes(overrides: {
  user?: Subject<TestSchema>;
  tenantId?: string;
  params?: Record<string, string>;
} = {}) {
  const req: Record<string, unknown> = {
    headers: overrides.tenantId ? { "x-tenant-id": overrides.tenantId } : {},
    params: overrides.params ?? {},
    user: overrides.user,
  };

  let statusCode = 0;
  let jsonBody: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => jsonBody,
  };
}

describe("Express middleware", () => {
  it("allows when subject has matching role", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const middleware = guard(engine, "invoice:approve", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
    });

    const { req, res, getStatus, getBody } = createMockReqRes({
      user: { id: "u1", roles: [{ role: "admin" }] },
    });

    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(getStatus()).toBe(0);
    expect(getBody()).toBeUndefined();
  });

  it("denies with 403 when subject lacks the role", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const middleware = guard(engine, "invoice:approve", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
    });

    const { req, res, getStatus, getBody } = createMockReqRes({
      user: { id: "u2", roles: [{ role: "viewer" }] },
    });

    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(getStatus()).toBe(403);
    expect(getBody()).toEqual({
      error: "Forbidden",
      reason: expect.stringContaining("default deny"),
    });
  });

  it("returns 401 when subject is missing", () => {
    const engine = new AccessEngine<TestSchema>({ schema });

    const middleware = guard(engine, "invoice:read", "invoice", {
      getSubject: () => undefined,
    });

    const { req, res, getStatus, getBody } = createMockReqRes();

    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(getStatus()).toBe(401);
    expect(getBody()).toEqual({ error: "Unauthorized — no subject" });
  });

  it("uses custom onDenied handler when provided", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const middleware = guard(engine, "invoice:approve", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
      onDenied: (_req, res) => {
        res.status(403).json({ custom: "denied" });
      },
    });

    const { req, res, getStatus, getBody } = createMockReqRes({
      user: { id: "u2", roles: [{ role: "viewer" }] },
    });

    middleware(req, res, () => {});

    expect(getStatus()).toBe(403);
    expect(getBody()).toEqual({ custom: "denied" });
  });

  it("passes tenantId and resourceContext to the engine", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("member-own")
        .roles("member")
        .actions("invoice:read")
        .on("invoice")
        .when((ctx) => ctx.subject.id === ctx.resourceContext.ownerId)
        .build(),
    );

    const middleware = guard(engine, "invoice:read", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
      getResourceContext: (req) => ({
        ownerId: "u3",
        id: (req.params as Record<string, string>).id,
      }),
      getTenantId: (req) => (req.headers as Record<string, string>)["x-tenant-id"],
    });

    const { req: allowReq, res: allowRes } = createMockReqRes({
      user: { id: "u3", roles: [{ role: "member", tenantId: "acme" }] },
      tenantId: "acme",
      params: { id: "inv-1" },
    });

    let nextCalled = false;
    middleware(allowReq, allowRes, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);

    const { req: denyReq, res: denyRes, getStatus } = createMockReqRes({
      user: { id: "u4", roles: [{ role: "member", tenantId: "acme" }] },
      tenantId: "acme",
      params: { id: "inv-1" },
    });

    nextCalled = false;
    middleware(denyReq, denyRes, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(getStatus()).toBe(403);
  });

  it("calls next(err) when engine throws", () => {
    const engine = new AccessEngine<TestSchema>({ schema, strictTenancy: true });

    const middleware = guard(engine, "invoice:read", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
    });

    const { req, res } = createMockReqRes({
      user: { id: "u1", roles: [{ role: "admin", tenantId: "acme" }] },
    });

    let nextError: unknown;
    middleware(req, res, (err) => { nextError = err; });

    expect(nextError).toBeInstanceOf(Error);
  });
});
