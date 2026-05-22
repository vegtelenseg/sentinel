import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow, deny, createPolicyFactory } from "./policy-builder.js";
import { importRules } from "./serialization.js";
import { createAuthServer } from "./server.js";
import { toAuditEntry } from "./types.js";
import type { SchemaDefinition, Subject } from "./types.js";

// ---------------------------------------------------------------------------
// Shared test schema
// ---------------------------------------------------------------------------

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "manager" | "member" | "viewer";
  resources: "invoice" | "project" | "report";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:update"
    | "invoice:approve"
    | "invoice:send"
    | "project:read"
    | "project:archive"
    | "report:read"
    | "report:export";
}

const schema: TestSchema = {} as TestSchema;

function makeUser(
  id: string,
  roles: { role: TestSchema["roles"]; tenantId?: string }[],
  attributes?: Record<string, unknown>,
): Subject<TestSchema> {
  return { id, roles, attributes };
}

// ===========================================================================
// SECURITY FIXES
// ===========================================================================

describe("Security: cache skips conditional rules", () => {
  it("does not cache evaluations where a conditional rule matched", () => {
    const engine = new AccessEngine<TestSchema>({ schema, cacheSize: 100 });
    engine.addRule(
      allow<TestSchema>()
        .id("owner-update")
        .roles("member")
        .actions("invoice:update")
        .on("invoice")
        .when((ctx) => ctx.subject.id === ctx.resourceContext["ownerId"])
        .build(),
    );

    const user = makeUser("u1", [{ role: "member" }]);

    const d1 = engine.evaluate(user, "invoice:update", "invoice", { ownerId: "u1" });
    expect(d1.allowed).toBe(true);

    const d2 = engine.evaluate(user, "invoice:update", "invoice", { ownerId: "someone-else" });
    expect(d2.allowed).toBe(false);
    expect(d2).not.toBe(d1);
  });

  it("caches evaluations where only unconditional rules matched", () => {
    const engine = new AccessEngine<TestSchema>({ schema, cacheSize: 100 });
    engine.addRule(
      allow<TestSchema>()
        .id("admin-all")
        .roles("admin")
        .anyAction()
        .anyResource()
        .build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    const d1 = engine.evaluate(admin, "invoice:read", "invoice");
    const d2 = engine.evaluate(admin, "invoice:read", "invoice");
    expect(d1).toBe(d2);
    expect(engine.cacheStats!.size).toBe(1);
  });
});

describe("Security: rules are frozen on add", () => {
  it("prevents mutation of added rules", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    const rule = allow<TestSchema>()
      .id("r1")
      .roles("admin")
      .anyAction()
      .anyResource()
      .build();
    engine.addRule(rule);

    const stored = engine.getRules()[0]!;
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stored as any).effect = "deny";
    }).toThrow();
  });
});

describe("Security: strictTenancy mode", () => {
  it("throws when subject has tenant-scoped roles but no tenantId is provided", () => {
    const engine = new AccessEngine<TestSchema>({ schema, strictTenancy: true });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const user = makeUser("u1", [
      { role: "admin", tenantId: "t1" },
      { role: "viewer", tenantId: "t2" },
    ]);

    expect(() => engine.evaluate(user, "invoice:read", "invoice")).toThrow(
      "strictTenancy",
    );
  });

  it("allows evaluation when tenantId is provided in strict mode", () => {
    const engine = new AccessEngine<TestSchema>({ schema, strictTenancy: true });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const user = makeUser("u1", [{ role: "admin", tenantId: "t1" }]);
    const decision = engine.evaluate(user, "invoice:read", "invoice", {}, "t1");
    expect(decision.allowed).toBe(true);
  });

  it("allows evaluation without tenantId when subject has no tenant-scoped roles", () => {
    const engine = new AccessEngine<TestSchema>({ schema, strictTenancy: true });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const globalAdmin = makeUser("u1", [{ role: "admin" }]);
    const decision = engine.evaluate(globalAdmin, "invoice:read", "invoice");
    expect(decision.allowed).toBe(true);
  });
});

describe("Security: onConditionError callback", () => {
  it("surfaces condition errors through the callback", () => {
    const errors: { ruleId: string; conditionIndex: number; error: unknown }[] = [];
    const engine = new AccessEngine<TestSchema>({
      schema,
      onConditionError: (err) => errors.push(err),
    });

    engine.addRule(
      allow<TestSchema>()
        .id("boom-rule")
        .roles("member")
        .actions("invoice:read")
        .on("invoice")
        .when(() => {
          throw new Error("Database connection failed");
        })
        .build(),
    );

    const user = makeUser("u1", [{ role: "member" }]);
    const decision = engine.evaluate(user, "invoice:read", "invoice");

    expect(decision.allowed).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.ruleId).toBe("boom-rule");
    expect(errors[0]!.conditionIndex).toBe(0);
    expect((errors[0]!.error as Error).message).toBe("Database connection failed");
  });

  it("still denies when condition throws (fail-closed)", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("throws")
        .roles("admin")
        .anyAction()
        .anyResource()
        .when(() => {
          throw new Error("unexpected");
        })
        .build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    const decision = engine.evaluate(admin, "invoice:read", "invoice");
    expect(decision.allowed).toBe(false);
  });
});

describe("Security: serialization import validation", () => {
  it("rejects rules with invalid effect", () => {
    const doc = {
      version: 1 as const,
      rules: [
        {
          id: "bad",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          effect: "permit" as any,
          roles: "*" as const,
          actions: "*" as const,
          resources: "*" as const,
        },
      ],
    };
    expect(() => importRules(doc)).toThrow('Invalid effect "permit"');
  });

  it("rejects rules with missing id", () => {
    const doc = {
      version: 1 as const,
      rules: [
        {
          id: "",
          effect: "allow" as const,
          roles: "*" as const,
          actions: "*" as const,
          resources: "*" as const,
        },
      ],
    };
    expect(() => importRules(doc)).toThrow('missing a valid "id"');
  });
});

// ===========================================================================
// SERVER SECURITY
// ===========================================================================

describe("Server: authentication hook", () => {
  const engine = new AccessEngine<TestSchema>({ schema });
  engine.addRule(
    allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
  );

  const server = createAuthServer({
    engine,
    port: 0,
    authenticate: (req) => {
      return req.headers["x-api-key"] === "secret-token";
    },
  });
  let baseUrl: string;

  beforeAll(async () => {
    await server.start();
    const addr = server.httpServer.address();
    if (typeof addr === "object" && addr) {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  afterAll(async () => {
    await server.stop();
  });

  it("returns 401 when auth header is missing", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(401);
  });

  it("returns 200 when auth header is correct", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { "x-api-key": "secret-token" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

describe("Server: body size limit", () => {
  const engine = new AccessEngine<TestSchema>({ schema });
  engine.addRule(
    allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
  );

  const server = createAuthServer({
    engine,
    port: 0,
    maxBodyBytes: 100,
  });
  let baseUrl: string;

  beforeAll(async () => {
    await server.start();
    const addr = server.httpServer.address();
    if (typeof addr === "object" && addr) {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  afterAll(async () => {
    await server.stop();
  });

  it("rejects oversized request bodies", async () => {
    const bigPayload = JSON.stringify({
      subject: { id: "u1", roles: [{ role: "admin" }] },
      action: "invoice:read",
      resource: "invoice",
      extra: "x".repeat(200),
    });

    const res = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bigPayload,
    });

    expect(res.status).toBe(413);
  });
});

// ===========================================================================
// DX FEATURES
// ===========================================================================

describe("DX: createPolicyFactory", () => {
  it("eliminates generic noise from policy creation", () => {
    const { allow, deny } = createPolicyFactory<TestSchema>();

    const rule1 = allow()
      .id("manager-invoice")
      .roles("manager")
      .actions("invoice:create", "invoice:read")
      .on("invoice")
      .build();

    const rule2 = deny()
      .id("no-export")
      .roles("viewer")
      .actions("report:export")
      .on("report")
      .build();

    expect(rule1.effect).toBe("allow");
    expect(rule1.roles).toEqual(["manager"]);
    expect(rule2.effect).toBe("deny");

    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(rule1, rule2);

    const manager = makeUser("u1", [{ role: "manager" }]);
    expect(engine.evaluate(manager, "invoice:create", "invoice").allowed).toBe(true);
  });
});

describe("DX: engine.permitted()", () => {
  it("returns the set of allowed actions for a subject on a resource", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(
      allow<TestSchema>()
        .id("viewer-read")
        .roles("viewer")
        .actions("invoice:read", "project:read", "report:read")
        .anyResource()
        .build(),
      deny<TestSchema>()
        .id("no-export")
        .roles("viewer")
        .actions("report:export")
        .on("report")
        .build(),
    );

    const viewer = makeUser("u1", [{ role: "viewer" }]);
    const allowed = engine.permitted(
      viewer,
      "invoice",
      ["invoice:read", "invoice:create", "invoice:update", "invoice:approve"],
    );

    expect(allowed).toEqual(new Set(["invoice:read"]));
  });
});

describe("DX: engine.explain()", () => {
  it("returns a detailed evaluation trace", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(
      allow<TestSchema>()
        .id("admin-all")
        .roles("admin")
        .anyAction()
        .anyResource()
        .build(),
      deny<TestSchema>()
        .id("no-approve")
        .roles("manager")
        .actions("invoice:approve")
        .on("invoice")
        .describe("Managers cannot approve invoices")
        .build(),
      allow<TestSchema>()
        .id("manager-read")
        .roles("manager")
        .actions("invoice:read")
        .on("invoice")
        .build(),
    );

    const manager = makeUser("u1", [{ role: "manager" }]);
    const result = engine.explain(manager, "invoice:read", "invoice");

    expect(result.allowed).toBe(true);
    expect(result.evaluatedRules.length).toBeGreaterThanOrEqual(2);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    const adminRule = result.evaluatedRules.find((r) => r.rule.id === "admin-all");
    expect(adminRule).toBeDefined();
    expect(adminRule!.roleMatched).toBe(false);
    expect(adminRule!.matched).toBe(false);

    const readRule = result.evaluatedRules.find((r) => r.rule.id === "manager-read");
    expect(readRule).toBeDefined();
    expect(readRule!.matched).toBe(true);
  });

  it("shows condition-level failure details", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("conditional")
        .roles("member")
        .actions("invoice:update")
        .on("invoice")
        .when((ctx) => ctx.subject.id === ctx.resourceContext["ownerId"])
        .when(() => {
          throw new Error("DB down");
        })
        .build(),
    );

    const user = makeUser("u1", [{ role: "member" }]);
    const result = engine.explain(user, "invoice:update", "invoice", { ownerId: "u1" });

    expect(result.allowed).toBe(false);
    const evaluated = result.evaluatedRules[0]!;
    expect(evaluated.conditionResults).toHaveLength(2);
    expect(evaluated.conditionResults[0]!.passed).toBe(true);
    expect(evaluated.conditionResults[1]!.passed).toBe(false);
    expect(evaluated.conditionResults[1]!.error).toBe("DB down");
  });

  it("throws clear error when explain() hits async condition", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("async-explain")
        .roles("member")
        .actions("report:export")
        .on("report")
        .when(async () => true)
        .build(),
    );
    const user = makeUser("u1", [{ role: "member" }]);
    expect(() => engine.explain(user, "report:export", "report")).toThrow(
      "Async condition encountered. Use explainAsync() instead.",
    );
  });
});

describe("DX: explainAsync()", () => {
  it("works with async conditions", async () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("async-check")
        .roles("member")
        .actions("report:export")
        .on("report")
        .when(async (ctx) => ctx.subject.attributes?.["canExport"] === true)
        .build(),
    );

    const user = makeUser("u1", [{ role: "member" }], { canExport: true });
    const result = await engine.explainAsync(user, "report:export", "report");

    expect(result.allowed).toBe(true);
    expect(result.evaluatedRules[0]!.conditionResults[0]!.passed).toBe(true);
  });

  it("works with async conditions on default engine", async () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("async-no-flag")
        .roles("member")
        .actions("report:export")
        .on("report")
        .when(async (ctx) => ctx.subject.attributes?.["canExport"] === true)
        .build(),
    );
    const user = makeUser("u1", [{ role: "member" }], { canExport: true });
    const result = await engine.explainAsync(user, "report:export", "report");
    expect(result.allowed).toBe(true);
  });
});

describe("DX: toAuditEntry()", () => {
  it("converts a Decision to a serialization-safe AuditEntry", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("admin-all")
        .roles("admin")
        .anyAction()
        .anyResource()
        .describe("Full admin access")
        .build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    const decision = engine.evaluate(admin, "invoice:approve", "invoice");
    const entry = toAuditEntry(decision);

    expect(entry.allowed).toBe(true);
    expect(entry.matchedRuleId).toBe("admin-all");
    expect(entry.matchedRuleDescription).toBe("Full admin access");
    expect(entry.subjectId).toBe("u1");
    expect(entry.action).toBe("invoice:approve");
    expect(entry.resource).toBe("invoice");
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);

    const json = JSON.stringify(entry);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(entry);
  });

  it("handles default-deny decisions", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    const user = makeUser("u1", [{ role: "viewer" }]);
    const decision = engine.evaluate(user, "invoice:approve", "invoice");
    const entry = toAuditEntry(decision);

    expect(entry.allowed).toBe(false);
    expect(entry.effect).toBe("default-deny");
    expect(entry.matchedRuleId).toBeNull();
    expect(entry.matchedRuleDescription).toBeNull();
  });
});

describe("DX: permittedAsync()", () => {
  it("works with async conditions", async () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("member-read")
        .roles("member")
        .actions("invoice:read", "project:read")
        .anyResource()
        .build(),
    );

    const user = makeUser("u1", [{ role: "member" }]);
    const allowed = await engine.permittedAsync(
      user,
      "invoice",
      ["invoice:read", "invoice:create", "invoice:update"],
    );
    expect(allowed).toEqual(new Set(["invoice:read"]));
  });
});
