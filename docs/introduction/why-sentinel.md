# Why Sentinel?

[← What is Sentinel?](./what-is-sentinel.md) · [Documentation home](/)

Teams adopt Sentinel when authorization has outgrown `if (user.role === …)` but they do not want the operational weight of a hosted policy service or a separate policy language. This page explains the design bets behind the library — not marketing bullets, but the reasoning you need when comparing alternatives.

---

## 1. Type-safe schema as a security boundary

Authorization bugs often come from **typos and drift**: `"invoice:aprove"` ships to production because nothing validated the string at compile time.

Sentinel threads a single `SchemaDefinition` through every API surface:

```typescript
interface MySchema extends SchemaDefinition {
  roles: "admin" | "member";
  resources: "invoice";
  actions: "invoice:approve" | "invoice:read";
}

// Compile error — typo caught before deploy
engine.evaluate(user, "invoice:aprove", "invoice");
//                     ^^^^^^^^^^^^^^^^
```

**Why this matters:** Autocomplete is not the goal. The goal is making invalid authorization calls **unrepresentable** in typed code paths — the same reason you type your API request bodies.

The schema object passed to `new AccessEngine({ schema: {} as MySchema })` is a type-only anchor; it is not deserialized or validated at runtime. You own the source of truth in TypeScript.

→ Deep dive: [The schema](../concepts/schema.md)

---

## 2. Domain actions, not CRUD

CRUD libraries map permissions to `create`, `read`, `update`, `delete`. Real products speak in domain verbs:

- `invoice:approve`
- `order:ship`
- `user:impersonate`
- `project:archive`

Sentinel uses the `resource:verb` convention natively. Actions are strings in your schema; wildcards like `invoice:*` compile to regex at rule load time.

**Why this matters:** Authorization rules read like product language. PMs and engineers share the same vocabulary in tickets, audits, and policy descriptions.

→ Deep dive: [Actions and resources](../concepts/actions-and-resources.md)

---

## 3. Multitenancy in the data model

SaaS users commonly hold **different roles in different tenants**. Sentinel models that in `RoleAssignment`:

```typescript
const user: Subject<MySchema> = {
  id: "user-42",
  roles: [
    { role: "admin", tenantId: "acme" },
    { role: "viewer", tenantId: "globex" },
  ],
};
```

When you evaluate with `tenantId: "acme"`, only roles for `acme` (plus **global** roles without `tenantId`) apply. No middleware convention, no "effective role" cache.

**Strict tenancy** goes further: if enabled, omitting `tenantId` for a subject with tenant-scoped roles **throws** in development instead of silently using the wrong role set.

**Why this matters:** Cross-tenant authorization bugs are among the worst class of SaaS vulnerabilities. Modeling tenants in the subject keeps the engine honest.

→ Deep dive: [Multitenancy](../concepts/multitenancy.md)

---

## 4. `explain()` — authorization you can debug

When access fails in production, you need a **replay**, not archaeology.

```typescript
const result = engine.explain(user, "invoice:approve", "invoice", {}, "tenant-b");
// result.allowed → false
// result.reason → "No matching rule — default deny"
// result.evaluatedRules → per-rule: roleMatched, actionMatched, conditionResults
```

Each entry in `evaluatedRules` tells you whether that rule matched on role, action, resource, and every condition. Tests can assert on specific condition failures without mocking half the app.

**Why this matters:** Explain turns authorization from opaque boolean logic into an inspectable trace — similar to how query planners explain SQL.

→ Deep dive: [Debugging with explain()](../guides/explain-and-debugging.md)

---

## 5. Audit trail without a sidecar

Every evaluation can emit a structured event via `onDecision`. `toAuditEntry()` strips functions and circular references so you can persist JSON safely.

**Why this matters:** Compliance and incident response need *who asked, what for, what decided, how long* — not a custom wrapper around every call site.

→ Deep dive: [Audit logging](../guides/audit-logging.md)

---

## 6. Zero dependencies, small surface

Sentinel has **no runtime dependencies**. Middleware subpaths (`@siremzam/sentinel/middleware/express`) use minimal inline types so you are not forced to install framework type packages for the core library.

**Why this matters:** Authorization runs on every request. Supply-chain and bundle size matter; a focused engine is easier to security-review than a framework-within-a-framework.

---

## 7. Pure TypeScript policies

No `model.conf`, no CSV policy files, no Rego. Policies are code — diffable, testable, refactorable with your IDE.

When you need storage in a database, JSON export/import covers rule *data*; named conditions in a `ConditionRegistry` cover rule *logic*.

→ Deep dive: [JSON policy serialization](../guides/json-serialization.md)

---

## Comparison snapshot

| Capability | Sentinel | Typical alternatives |
|---|---|---|
| Full TypeScript inference on actions/roles | Native | Partial or manual |
| Domain actions | Native | Often via config or subjects |
| Per-tenant roles | Built-in | Manual |
| Per-rule explain trace | `explain()` | Rare |
| Audit hook | `onDecision` | Often DIY |
| Policy language | TypeScript | DSL / Rego / CSV |
| Dependencies | 0 | Varies |

Full matrix: [Feature comparison](../comparisons/feature-matrix.md)

---

## Related pages

- [Quickstart](../getting-started/quickstart.md)
- [When not to use Sentinel](./when-not-to-use.md)
- [Migrating from CASL](../comparisons/from-casl.md)
