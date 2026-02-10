import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow, deny } from "./policy-builder.js";
import type { SchemaDefinition, Subject, Decision } from "./types.js";

// ---------------------------------------------------------------------------
// Test schema — a realistic SaaS domain
// ---------------------------------------------------------------------------

interface TestSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "manager" | "member" | "viewer";
  resources: "invoice" | "project" | "user" | "report";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:update"
    | "invoice:approve"
    | "invoice:send"
    | "project:create"
    | "project:read"
    | "project:archive"
    | "user:read"
    | "user:impersonate"
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

// ---------------------------------------------------------------------------
// Basic RBAC
// ---------------------------------------------------------------------------

describe("Basic RBAC", () => {
  let engine: AccessEngine<TestSchema>;

  beforeEach(() => {
    engine = new AccessEngine({ schema });
    engine.addRules(
      allow<TestSchema>()
        .id("admin-all")
        .roles("admin")
        .anyAction()
        .anyResource()
        .describe("Admins can do anything")
        .build(),
      allow<TestSchema>()
        .id("viewer-read")
        .roles("viewer")
        .actions("invoice:read", "project:read", "user:read", "report:read")
        .anyResource()
        .describe("Viewers can read")
        .build(),
    );
  });

  it("allows admin to perform any action", () => {
    const admin = makeUser("u1", [{ role: "admin" }]);
    const decision = engine.evaluate(admin, "invoice:approve", "invoice");
    expect(decision.allowed).toBe(true);
    expect(decision.matchedRule?.id).toBe("admin-all");
  });

  it("allows viewer to read", () => {
    const viewer = makeUser("u2", [{ role: "viewer" }]);
    const decision = engine.evaluate(viewer, "invoice:read", "invoice");
    expect(decision.allowed).toBe(true);
  });

  it("denies viewer from approving invoices", () => {
    const viewer = makeUser("u2", [{ role: "viewer" }]);
    const decision = engine.evaluate(viewer, "invoice:approve", "invoice");
    expect(decision.allowed).toBe(false);
    expect(decision.effect).toBe("default-deny");
  });

  it("denies unknown roles entirely", () => {
    const nobody = makeUser("u3", [{ role: "member" }]);
    const decision = engine.evaluate(nobody, "invoice:read", "invoice");
    expect(decision.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fluent API: can(user).perform(action).on(resource)
// ---------------------------------------------------------------------------

describe("Fluent check API", () => {
  it("works with the chained syntax", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("manager-approve")
        .roles("manager")
        .actions("invoice:approve")
        .on("invoice")
        .build(),
    );

    const manager = makeUser("u1", [{ role: "manager" }]);
    const decision = engine.can(manager).perform("invoice:approve").on("invoice");
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toContain("manager-approve");
  });
});

// ---------------------------------------------------------------------------
// Domain actions (not CRUD)
// ---------------------------------------------------------------------------

describe("Domain-based actions", () => {
  it("handles domain verbs like impersonate and archive", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(
      allow<TestSchema>()
        .id("owner-impersonate")
        .roles("owner")
        .actions("user:impersonate")
        .on("user")
        .build(),
      allow<TestSchema>()
        .id("manager-archive")
        .roles("manager")
        .actions("project:archive")
        .on("project")
        .build(),
    );

    const owner = makeUser("u1", [{ role: "owner" }]);
    expect(engine.evaluate(owner, "user:impersonate", "user").allowed).toBe(true);
    expect(engine.evaluate(owner, "project:archive", "project").allowed).toBe(false);

    const manager = makeUser("u2", [{ role: "manager" }]);
    expect(engine.evaluate(manager, "project:archive", "project").allowed).toBe(true);
    expect(engine.evaluate(manager, "user:impersonate", "user").allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Conditions (ABAC)
// ---------------------------------------------------------------------------

describe("Conditions (ABAC)", () => {
  it("allows access when condition passes", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("own-invoice-update")
        .roles("member")
        .actions("invoice:update")
        .on("invoice")
        .when((ctx) => ctx.subject.id === ctx.resourceContext["ownerId"])
        .describe("Members can update their own invoices")
        .build(),
    );

    const user = makeUser("u5", [{ role: "member" }]);
    const allowed = engine.evaluate(user, "invoice:update", "invoice", { ownerId: "u5" });
    expect(allowed.allowed).toBe(true);
  });

  it("denies access when condition fails", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("own-invoice-update")
        .roles("member")
        .actions("invoice:update")
        .on("invoice")
        .when((ctx) => ctx.subject.id === ctx.resourceContext["ownerId"])
        .build(),
    );

    const user = makeUser("u5", [{ role: "member" }]);
    const denied = engine.evaluate(user, "invoice:update", "invoice", { ownerId: "u99" });
    expect(denied.allowed).toBe(false);
  });

  it("supports multiple conditions (all must pass)", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("conditional-read")
        .roles("member")
        .actions("report:read")
        .on("report")
        .when((ctx) => ctx.subject.attributes?.["department"] === "finance")
        .when((ctx) => (ctx.resourceContext["confidentialityLevel"] as number) <= 3)
        .build(),
    );

    const financeUser = makeUser("u6", [{ role: "member" }], { department: "finance" });
    expect(
      engine.evaluate(financeUser, "report:read", "report", { confidentialityLevel: 2 }).allowed,
    ).toBe(true);
    expect(
      engine.evaluate(financeUser, "report:read", "report", { confidentialityLevel: 5 }).allowed,
    ).toBe(false);

    const engineeringUser = makeUser("u7", [{ role: "member" }], { department: "engineering" });
    expect(
      engine.evaluate(engineeringUser, "report:read", "report", { confidentialityLevel: 1 })
        .allowed,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Async conditions
// ---------------------------------------------------------------------------

describe("Async conditions", () => {
  it("evaluateAsync supports promise-based conditions", async () => {
    const engine = new AccessEngine<TestSchema>({ schema, asyncConditions: true });
    engine.addRule(
      allow<TestSchema>()
        .id("async-check")
        .roles("member")
        .actions("report:export")
        .on("report")
        .when(async (ctx) => {
          await new Promise((r) => setTimeout(r, 10));
          return ctx.subject.attributes?.["canExport"] === true;
        })
        .build(),
    );

    const user = makeUser("u8", [{ role: "member" }], { canExport: true });
    const decision = await engine.evaluateAsync(user, "report:export", "report");
    expect(decision.allowed).toBe(true);
  });

  it("throws if evaluate() is called with asyncConditions enabled", () => {
    const engine = new AccessEngine<TestSchema>({ schema, asyncConditions: true });
    const user = makeUser("u1", [{ role: "admin" }]);
    expect(() => engine.evaluate(user, "invoice:read", "invoice")).toThrow(
      "evaluateAsync",
    );
  });
});

// ---------------------------------------------------------------------------
// Multitenancy
// ---------------------------------------------------------------------------

describe("Multitenancy", () => {
  let engine: AccessEngine<TestSchema>;

  beforeEach(() => {
    engine = new AccessEngine({ schema });
    engine.addRules(
      allow<TestSchema>()
        .id("admin-all")
        .roles("admin")
        .anyAction()
        .anyResource()
        .build(),
      allow<TestSchema>()
        .id("viewer-read")
        .roles("viewer")
        .actions("invoice:read", "project:read")
        .anyResource()
        .build(),
    );
  });

  it("scopes roles to tenants", () => {
    const user = makeUser("u10", [
      { role: "admin", tenantId: "tenant-a" },
      { role: "viewer", tenantId: "tenant-b" },
    ]);

    const inA = engine.evaluate(user, "invoice:approve", "invoice", {}, "tenant-a");
    expect(inA.allowed).toBe(true);

    const inB = engine.evaluate(user, "invoice:approve", "invoice", {}, "tenant-b");
    expect(inB.allowed).toBe(false);

    const readInB = engine.evaluate(user, "invoice:read", "invoice", {}, "tenant-b");
    expect(readInB.allowed).toBe(true);
  });

  it("allows global roles (no tenantId) in any tenant context", () => {
    const superAdmin = makeUser("u11", [{ role: "admin" }]);
    const decision = engine.evaluate(
      superAdmin,
      "invoice:approve",
      "invoice",
      {},
      "any-tenant",
    );
    expect(decision.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Priority & deny-wins-at-equal-priority
// ---------------------------------------------------------------------------

describe("Priority and deny resolution", () => {
  it("deny wins over allow at equal priority", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(
      allow<TestSchema>()
        .id("allow-all")
        .anyRole()
        .anyAction()
        .anyResource()
        .build(),
      deny<TestSchema>()
        .id("deny-impersonate")
        .anyRole()
        .actions("user:impersonate")
        .on("user")
        .build(),
    );

    const user = makeUser("u1", [{ role: "admin" }]);
    expect(engine.evaluate(user, "user:impersonate", "user").allowed).toBe(false);
    expect(engine.evaluate(user, "invoice:read", "invoice").allowed).toBe(true);
  });

  it("higher priority rule wins", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(
      deny<TestSchema>()
        .id("general-deny")
        .anyRole()
        .actions("report:export")
        .on("report")
        .priority(1)
        .build(),
      allow<TestSchema>()
        .id("owner-override")
        .roles("owner")
        .actions("report:export")
        .on("report")
        .priority(10)
        .describe("Owner overrides the general deny")
        .build(),
    );

    const owner = makeUser("u1", [{ role: "owner" }]);
    expect(engine.evaluate(owner, "report:export", "report").allowed).toBe(true);

    const viewer = makeUser("u2", [{ role: "viewer" }]);
    expect(engine.evaluate(viewer, "report:export", "report").allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Observability & audit
// ---------------------------------------------------------------------------

describe("Observability", () => {
  it("emits decision events to listeners", () => {
    const log: Decision<TestSchema>[] = [];
    const engine = new AccessEngine<TestSchema>({
      schema,
      onDecision: (d) => log.push(d),
    });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    engine.evaluate(admin, "invoice:create", "invoice");
    engine.evaluate(admin, "project:read", "project");

    expect(log).toHaveLength(2);
    expect(log[0]!.allowed).toBe(true);
    expect(log[0]!.action).toBe("invoice:create");
    expect(log[1]!.action).toBe("project:read");
  });

  it("supports adding and removing listeners at runtime", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const spy = vi.fn();
    const unsubscribe = engine.onDecision(spy);

    const admin = makeUser("u1", [{ role: "admin" }]);
    engine.evaluate(admin, "invoice:read", "invoice");
    expect(spy).toHaveBeenCalledOnce();

    unsubscribe();
    engine.evaluate(admin, "invoice:read", "invoice");
    expect(spy).toHaveBeenCalledOnce();
  });

  it("includes timing and reason in decisions", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("r1")
        .roles("admin")
        .anyAction()
        .anyResource()
        .describe("Admin super rule")
        .build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    const decision = engine.evaluate(admin, "invoice:read", "invoice");

    expect(decision.durationMs).toBeGreaterThanOrEqual(0);
    expect(decision.timestamp).toBeGreaterThan(0);
    expect(decision.reason).toContain("Admin super rule");
  });

  it("listener errors do not break evaluation", () => {
    const engine = new AccessEngine<TestSchema>({
      schema,
      onDecision: () => {
        throw new Error("boom");
      },
    });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    const decision = engine.evaluate(admin, "invoice:read", "invoice");
    expect(decision.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rule management
// ---------------------------------------------------------------------------

describe("Rule management", () => {
  it("can add, remove, list, and clear rules", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );
    engine.addRule(
      deny<TestSchema>().id("r2").roles("viewer").actions("invoice:approve").on("invoice").build(),
    );

    expect(engine.getRules()).toHaveLength(2);

    const removed = engine.removeRule("r1");
    expect(removed).toBe(true);
    expect(engine.getRules()).toHaveLength(1);

    expect(engine.removeRule("nonexistent")).toBe(false);

    engine.clearRules();
    expect(engine.getRules()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Wildcard rules
// ---------------------------------------------------------------------------

describe("Wildcard rules", () => {
  it("anyRole matches all roles", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>().id("public-read").anyRole().actions("project:read").on("project").build(),
    );

    const viewer = makeUser("u1", [{ role: "viewer" }]);
    const member = makeUser("u2", [{ role: "member" }]);
    expect(engine.evaluate(viewer, "project:read", "project").allowed).toBe(true);
    expect(engine.evaluate(member, "project:read", "project").allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge case: default deny with no rules
// ---------------------------------------------------------------------------

describe("Default behavior", () => {
  it("default-denies when no rules match", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    const user = makeUser("u1", [{ role: "admin" }]);
    const decision = engine.evaluate(user, "invoice:read", "invoice");
    expect(decision.allowed).toBe(false);
    expect(decision.effect).toBe("default-deny");
    expect(decision.matchedRule).toBeNull();
  });
});
