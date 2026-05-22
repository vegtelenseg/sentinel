import { describe, it, expect, beforeEach } from "vitest";
import {
  AccessEngine,
  createPolicyFactory,
  RoleHierarchy,
} from "../../src/index.js";
import type { SchemaDefinition, Subject } from "../../src/index.js";

interface AppSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "member" | "viewer";
  resources: "invoice" | "project" | "user";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:approve"
    | "invoice:send"
    | "project:read"
    | "project:archive"
    | "user:read"
    | "user:invite";
}

const { allow } = createPolicyFactory<AppSchema>();

function createExampleEngine() {
  const hierarchy = new RoleHierarchy<AppSchema>()
    .define("owner", ["admin"])
    .define("admin", ["member"])
    .define("member", ["viewer"]);

  const engine = new AccessEngine<AppSchema>({
    schema: {} as AppSchema,
    roleHierarchy: hierarchy,
    strictTenancy: true,
  });

  engine.addRules(
    allow()
      .id("viewer-read")
      .roles("viewer")
      .actions("invoice:read", "project:read", "user:read")
      .anyResource()
      .build(),
    allow()
      .id("admin-approve-send")
      .roles("admin")
      .actions("invoice:approve", "invoice:send")
      .on("invoice")
      .build(),
    allow()
      .id("owner-all")
      .roles("owner")
      .anyAction()
      .anyResource()
      .priority(10)
      .build(),
  );

  return engine;
}

const alice: Subject<AppSchema> = {
  id: "alice",
  roles: [
    { role: "admin", tenantId: "acme" },
    { role: "viewer", tenantId: "globex" },
  ],
};

describe("express-multi-tenant policies", () => {
  let engine: ReturnType<typeof createExampleEngine>;

  beforeEach(() => {
    engine = createExampleEngine();
  });

  it.each([
    {
      name: "admin can approve in own tenant",
      user: alice,
      tenantId: "acme",
      action: "invoice:approve" as const,
      resource: "invoice" as const,
      allowed: true,
      matchedRuleId: "admin-approve-send",
    },
    {
      name: "viewer cannot approve even in tenant where they have viewer role",
      user: alice,
      tenantId: "globex",
      action: "invoice:approve" as const,
      resource: "invoice" as const,
      allowed: false,
      matchedRuleId: null,
    },
    {
      name: "viewer can read in globex tenant",
      user: alice,
      tenantId: "globex",
      action: "invoice:read" as const,
      resource: "invoice" as const,
      allowed: true,
      matchedRuleId: "viewer-read",
    },
    {
      name: "admin in acme cannot read as viewer rule when role is admin-only path",
      user: { id: "bob", roles: [{ role: "member", tenantId: "acme" }] } satisfies Subject<AppSchema>,
      tenantId: "acme",
      action: "invoice:approve" as const,
      resource: "invoice" as const,
      allowed: false,
      matchedRuleId: null,
    },
  ])("$name", ({ user, tenantId, action, resource, allowed, matchedRuleId }) => {
    const result = engine.explain(user, action, resource, {}, tenantId);
    const matched = result.evaluatedRules.find((r) => r.matched)?.rule.id ?? null;

    expect(result.allowed).toBe(allowed);
    expect(matched).toBe(matchedRuleId);
  });
});
