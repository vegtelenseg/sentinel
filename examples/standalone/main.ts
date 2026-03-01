/**
 * Standalone example — no HTTP server, just the engine.
 *
 * Run:  npx tsx main.ts
 */

import {
  AccessEngine,
  createPolicyFactory,
  RoleHierarchy,
  toAuditEntry,
} from "@siremzam/sentinel";
import type { SchemaDefinition, Subject } from "@siremzam/sentinel";

// ── Schema ──────────────────────────────────────────────────────────────────

interface AppSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "member" | "viewer";
  resources: "invoice" | "project" | "settings";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:approve"
    | "project:read"
    | "project:archive"
    | "settings:update";
}

// ── Hierarchy ───────────────────────────────────────────────────────────────

const hierarchy = new RoleHierarchy<AppSchema>()
  .define("owner", ["admin"])
  .define("admin", ["member"])
  .define("member", ["viewer"]);

// ── Engine ──────────────────────────────────────────────────────────────────

const { allow, deny } = createPolicyFactory<AppSchema>();

const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  roleHierarchy: hierarchy,
  strictTenancy: true,
  onDecision: (d) => {
    const entry = toAuditEntry(d);
    console.log(
      `  [audit] ${entry.allowed ? "ALLOW" : "DENY"} ${entry.action} on ${entry.resource}` +
      ` (${entry.durationMs.toFixed(2)}ms) — ${entry.reason}`,
    );
  },
});

engine.addRules(
  allow()
    .id("viewer-read")
    .roles("viewer")
    .actions("invoice:read", "project:read")
    .anyResource()
    .describe("Viewers can read invoices and projects")
    .build(),

  allow()
    .id("member-create")
    .roles("member")
    .actions("invoice:create")
    .on("invoice")
    .describe("Members can create invoices")
    .build(),

  allow()
    .id("admin-approve")
    .roles("admin")
    .actions("invoice:approve")
    .on("invoice")
    .describe("Admins can approve invoices")
    .build(),

  allow()
    .id("owner-settings")
    .roles("owner")
    .actions("settings:update")
    .on("settings")
    .describe("Only owners can change settings")
    .build(),

  deny()
    .id("no-archive")
    .anyRole()
    .actions("project:archive")
    .on("project")
    .describe("Archiving is disabled for now")
    .build(),

  allow()
    .id("owner-archive-override")
    .roles("owner")
    .actions("project:archive")
    .on("project")
    .priority(10)
    .describe("Owners can still archive")
    .build(),
);

// ── Users ───────────────────────────────────────────────────────────────────

const alice: Subject<AppSchema> = {
  id: "alice",
  roles: [
    { role: "admin", tenantId: "acme" },
    { role: "viewer", tenantId: "globex" },
  ],
};

const bob: Subject<AppSchema> = {
  id: "bob",
  roles: [{ role: "owner", tenantId: "acme" }],
};

// ── Evaluate ────────────────────────────────────────────────────────────────

console.log("─── Alice in Acme (admin) ───");
engine.evaluate(alice, "invoice:read", "invoice", {}, "acme");
engine.evaluate(alice, "invoice:approve", "invoice", {}, "acme");
engine.evaluate(alice, "project:archive", "project", {}, "acme");

console.log("\n─── Alice in Globex (viewer) ───");
engine.evaluate(alice, "invoice:read", "invoice", {}, "globex");
engine.evaluate(alice, "invoice:approve", "invoice", {}, "globex");

console.log("\n─── Bob in Acme (owner) ───");
engine.evaluate(bob, "invoice:approve", "invoice", {}, "acme");
engine.evaluate(bob, "project:archive", "project", {}, "acme");
engine.evaluate(bob, "settings:update", "settings", {}, "acme");

// ── Permitted set ───────────────────────────────────────────────────────────

console.log("\n─── What can Alice do with invoices in Acme? ───");
const actions = engine.permitted(
  alice,
  "invoice",
  ["invoice:create", "invoice:read", "invoice:approve"],
  {},
  "acme",
);
console.log(`  Permitted: { ${[...actions].join(", ")} }`);

// ── Explain ─────────────────────────────────────────────────────────────────

console.log("\n─── Why can't Alice archive in Acme? ───");
const trace = engine.explain(alice, "project:archive", "project", {}, "acme");
console.log(`  Allowed: ${trace.allowed}`);
console.log(`  Reason:  ${trace.reason}`);
for (const rule of trace.evaluatedRules) {
  if (rule.matched || rule.rule.actions !== "*") {
    console.log(
      `  Rule "${rule.rule.id}": role=${rule.roleMatched} action=${rule.actionMatched} ` +
      `resource=${rule.resourceMatched} → ${rule.matched ? "MATCHED" : "no match"}`,
    );
  }
}
