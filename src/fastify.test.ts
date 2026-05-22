import { describe, it, expect } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow } from "./policy-builder.js";
import { fastifyGuard } from "./middleware/fastify.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "member" | "viewer";
  resources: "invoice" | "project";
  actions: "invoice:create" | "invoice:read" | "invoice:approve" | "project:read";
}

const schema: TestSchema = {} as TestSchema;

function createMockReqReply(overrides: {
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
  let payload: unknown;
  const reply = {
    code(code: number) {
      statusCode = code;
      return this;
    },
    send(body?: unknown) {
      payload = body;
      return this;
    },
  };

  return {
    req,
    reply,
    getStatus: () => statusCode,
    getPayload: () => payload,
  };
}

describe("Fastify middleware", () => {
  it("allows when subject has matching role", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const preHandler = fastifyGuard(engine, "invoice:approve", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
    });

    const { req, reply } = createMockReqReply({
      user: { id: "u1", roles: [{ role: "admin" }] },
    });

    let doneCalled = false;
    preHandler(req, reply, () => { doneCalled = true; });

    expect(doneCalled).toBe(true);
  });

  it("denies with 403 when subject lacks the role", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const preHandler = fastifyGuard(engine, "invoice:approve", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
    });

    const { req, reply, getStatus, getPayload } = createMockReqReply({
      user: { id: "u2", roles: [{ role: "viewer" }] },
    });

    let doneCalled = false;
    preHandler(req, reply, () => { doneCalled = true; });

    expect(doneCalled).toBe(false);
    expect(getStatus()).toBe(403);
    expect(getPayload()).toEqual({
      error: "Forbidden",
      reason: expect.stringContaining("default deny"),
    });
  });

  it("returns 401 when subject is missing", () => {
    const engine = new AccessEngine<TestSchema>({ schema });

    const preHandler = fastifyGuard(engine, "invoice:read", "invoice", {
      getSubject: () => undefined,
    });

    const { req, reply, getStatus, getPayload } = createMockReqReply();

    let doneCalled = false;
    preHandler(req, reply, () => { doneCalled = true; });

    expect(doneCalled).toBe(false);
    expect(getStatus()).toBe(401);
    expect(getPayload()).toEqual({ error: "Unauthorized — no subject" });
  });

  it("uses custom onDenied handler when provided", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const preHandler = fastifyGuard(engine, "invoice:approve", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
      onDenied: (_req, reply) => {
        reply.code(403).send({ custom: "denied" });
      },
    });

    const { req, reply, getStatus, getPayload } = createMockReqReply({
      user: { id: "u2", roles: [{ role: "viewer" }] },
    });

    preHandler(req, reply, () => {});

    expect(getStatus()).toBe(403);
    expect(getPayload()).toEqual({ custom: "denied" });
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

    const preHandler = fastifyGuard(engine, "invoice:read", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
      getResourceContext: (req) => ({
        ownerId: "u3",
        id: (req.params as Record<string, string>).id,
      }),
      getTenantId: (req) => (req.headers as Record<string, string>)["x-tenant-id"],
    });

    const { req: allowReq, reply: allowReply } = createMockReqReply({
      user: { id: "u3", roles: [{ role: "member", tenantId: "acme" }] },
      tenantId: "acme",
      params: { id: "inv-1" },
    });

    let doneCalled = false;
    preHandler(allowReq, allowReply, () => { doneCalled = true; });
    expect(doneCalled).toBe(true);

    const { req: denyReq, reply: denyReply, getStatus } = createMockReqReply({
      user: { id: "u4", roles: [{ role: "member", tenantId: "acme" }] },
      tenantId: "acme",
      params: { id: "inv-1" },
    });

    doneCalled = false;
    preHandler(denyReq, denyReply, () => { doneCalled = true; });
    expect(doneCalled).toBe(false);
    expect(getStatus()).toBe(403);
  });

  it("calls done(err) when engine throws", () => {
    const engine = new AccessEngine<TestSchema>({ schema, strictTenancy: true });

    const preHandler = fastifyGuard(engine, "invoice:read", "invoice", {
      getSubject: (req) => req.user as Subject<TestSchema> | undefined,
    });

    const { req, reply } = createMockReqReply({
      user: { id: "u1", roles: [{ role: "admin", tenantId: "acme" }] },
    });

    let doneError: unknown;
    preHandler(req, reply, (err) => { doneError = err; });

    expect(doneError).toBeInstanceOf(Error);
  });
});
