import { describe, it, expect } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow } from "./policy-builder.js";
import { honoGuard } from "./middleware/hono.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "member" | "viewer";
  resources: "invoice" | "project";
  actions: "invoice:create" | "invoice:read" | "invoice:approve" | "project:read";
}

const schema: TestSchema = {} as TestSchema;

function createMockContext(overrides: {
  user?: Subject<TestSchema>;
  tenantId?: string;
  params?: Record<string, string>;
} = {}) {
  const store = new Map<string, unknown>();
  if (overrides.user) store.set("user", overrides.user);

  let responseData: { body: unknown; status: number } | null = null;
  const c = {
    req: {
      raw: new Request("http://localhost/test"),
      header(name: string) {
        if (name === "x-tenant-id") return overrides.tenantId;
        return undefined;
      },
      param(name: string) {
        return overrides.params?.[name];
      },
    },
    json(data: unknown, status = 200) {
      responseData = { body: data, status };
      return new Response(JSON.stringify(data), { status });
    },
    get<T = unknown>(key: string): T {
      return store.get(key) as T;
    },
    set(key: string, value: unknown) {
      store.set(key, value);
    },
  };

  return {
    context: c as Parameters<ReturnType<typeof honoGuard>>[0],
    getResponse: () => responseData,
  };
}

describe("Hono middleware", () => {
  it("allows when subject has matching role", async () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const middleware = honoGuard(engine, "invoice:approve", "invoice", {
      getSubject: (c) => c.get<Subject<TestSchema>>("user"),
    });

    const { context, getResponse } = createMockContext({
      user: { id: "u1", roles: [{ role: "admin" }] },
    });

    let nextCalled = false;
    await middleware(context, async () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(getResponse()).toBeNull();
  });

  it("denies with 403 when subject lacks the role", async () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const middleware = honoGuard(engine, "invoice:approve", "invoice", {
      getSubject: (c) => c.get<Subject<TestSchema>>("user"),
    });

    const { context, getResponse } = createMockContext({
      user: { id: "u2", roles: [{ role: "viewer" }] },
    });

    let nextCalled = false;
    await middleware(context, async () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    const resp = getResponse();
    expect(resp?.status).toBe(403);
    expect(resp?.body).toEqual({
      error: "Forbidden",
      reason: expect.stringContaining("default deny"),
    });
  });

  it("returns 401 when subject is missing", async () => {
    const engine = new AccessEngine<TestSchema>({ schema });

    const middleware = honoGuard(engine, "invoice:read", "invoice", {
      getSubject: () => undefined,
    });

    const { context, getResponse } = createMockContext();

    let nextCalled = false;
    await middleware(context, async () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    const resp = getResponse();
    expect(resp?.status).toBe(401);
    expect(resp?.body).toEqual({ error: "Unauthorized — no subject" });
  });

  it("uses custom onDenied handler when provided", async () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    );

    const middleware = honoGuard(engine, "invoice:approve", "invoice", {
      getSubject: (c) => c.get<Subject<TestSchema>>("user"),
      onDenied: (c) => c.json({ custom: "denied" }, 403),
    });

    const { context, getResponse } = createMockContext({
      user: { id: "u2", roles: [{ role: "viewer" }] },
    });

    await middleware(context, async () => {});

    const resp = getResponse();
    expect(resp?.status).toBe(403);
    expect(resp?.body).toEqual({ custom: "denied" });
  });

  it("passes tenantId and resourceContext to the engine", async () => {
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

    const middleware = honoGuard(engine, "invoice:read", "invoice", {
      getSubject: (c) => c.get<Subject<TestSchema>>("user"),
      getResourceContext: (c) => ({ ownerId: "u3", id: c.req.param("id") }),
      getTenantId: (c) => c.req.header("x-tenant-id"),
    });

    const { context: allowCtx } = createMockContext({
      user: { id: "u3", roles: [{ role: "member", tenantId: "acme" }] },
      tenantId: "acme",
      params: { id: "inv-1" },
    });

    let nextCalled = false;
    await middleware(allowCtx, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);

    const { context: denyCtx, getResponse } = createMockContext({
      user: { id: "u4", roles: [{ role: "member", tenantId: "acme" }] },
      tenantId: "acme",
      params: { id: "inv-1" },
    });

    nextCalled = false;
    await middleware(denyCtx, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(getResponse()?.status).toBe(403);
  });

  it("returns 500 when engine throws", async () => {
    const engine = new AccessEngine<TestSchema>({ schema, strictTenancy: true });

    const middleware = honoGuard(engine, "invoice:read", "invoice", {
      getSubject: (c) => c.get<Subject<TestSchema>>("user"),
    });

    const { context, getResponse } = createMockContext({
      user: { id: "u1", roles: [{ role: "admin", tenantId: "acme" }] },
      // no tenantId provided → strictTenancy throws
    });

    await middleware(context, async () => {});

    const resp = getResponse();
    expect(resp?.status).toBe(500);
    expect(resp?.body).toEqual({ error: "Internal authorization error" });
  });
});
