# Quickstart

[← Installation](./installation.md) · [Documentation home](/)

This guide takes you from an empty project to a working authorization check in a few minutes. Every snippet includes context for **what** you are writing and **why** it belongs in that step.

---

## Step 1: Define your schema

The schema is a TypeScript interface extending `SchemaDefinition`. It declares every **role**, **resource**, and **action** your application will ever check.

```typescript
import type { SchemaDefinition } from "@siremzam/sentinel";

interface AppSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "manager" | "member" | "viewer";
  resources: "invoice" | "project" | "user";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:approve"
    | "project:read"
    | "project:archive"
    | "user:read"
    | "user:impersonate";
}
```

**Why start here:** This interface is the contract for your entire authorization layer. Every `evaluate()` call, middleware route, and policy rule will be checked against these unions. Typos in action strings become compile errors.

You can add an optional `tenantId` union if you use branded tenant IDs:

```typescript
interface AppSchema extends SchemaDefinition {
  // ...
  tenantId: "acme" | "globex"; // optional — defaults to string
}
```

---

## Step 2: Create the engine and policy factory

```typescript
import { AccessEngine, createPolicyFactory } from "@siremzam/sentinel";

const { allow, deny } = createPolicyFactory<AppSchema>();

const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
});
```

**What `schema: {} as AppSchema` does:** Type anchor only — tells TypeScript which generic `S` to use. The engine does not read this object at runtime.

**Schema-bound builders:** `createPolicyFactory()` returns `allow` and `deny` already typed for `AppSchema`. See [Policy factory](../guides/policy-factory.md) for `engine.allow()` as an alternative when rules are defined inline.

---

## Step 3: Add policy rules

Rules are readable sentences in code form.

```typescript
engine.addRules(
  // Broad admin access
  allow()
    .roles("admin", "owner")
    .anyAction()
    .anyResource()
    .describe("Admins and owners have full access")
    .build(),

  // Managers and invoices
  allow()
    .roles("manager")
    .actions("invoice:*" as AppSchema["actions"])
    .on("invoice")
    .describe("Managers can do anything with invoices")
    .build(),

  // Members — own invoices only (ABAC)
  allow()
    .roles("member")
    .actions("invoice:read", "invoice:create")
    .on("invoice")
    .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
    .describe("Members can read/create their own invoices")
    .build(),
);
```

**How to read a rule:** "Allow users with role X to perform action Y on resource Z when condition W is true."

- `.describe()` sets a human-readable label — it appears in `Decision.reason` and audit entries.
- `.when()` adds attribute-based checks (ABAC). Multiple `.when()` calls are **AND**ed.
- `"invoice:*"` is a wildcard; see [Wildcard actions](../guides/wildcards.md).

---

## Step 4: Model a subject with tenant-scoped roles

A **subject** is whoever is asking for access — usually the authenticated user.

```typescript
import type { Subject } from "@siremzam/sentinel";

const user: Subject<AppSchema> = {
  id: "user-42",
  roles: [
    { role: "admin", tenantId: "acme-corp" },
    { role: "viewer", tenantId: "globex-inc" },
  ],
};
```

**Why an array of roles:** Real users are not a single global role. The engine filters assignments by `tenantId` at evaluation time.

Optional `attributes` on the subject hold extra data conditions can read via `ctx.subject.attributes`.

---

## Step 5: Evaluate access

```typescript
const decision = engine.evaluate(
  user,
  "invoice:approve",
  "invoice",
  { ownerId: "some-invoice" }, // resourceContext
  "acme-corp",                  // tenantId
);

console.log(decision.allowed); // true — admin in acme-corp
console.log(decision.reason);  // includes matched rule description
```

Same user, different tenant:

```typescript
engine.evaluate(user, "invoice:approve", "invoice", {}, "globex-inc");
// allowed: false — viewer in globex-inc
```

**Parameters explained:**

| Parameter | Purpose |
|---|---|
| `subject` | Who is asking |
| `action` | What they want to do (`invoice:approve`) |
| `resource` | What kind of thing (`invoice`) |
| `resourceContext` | Attributes of the specific resource (owner, status, …) |
| `tenantId` | Which organization's role set to use |

---

## Step 6: Debug with `explain()`

When `allowed` is false and you need detail:

```typescript
const trace = engine.explain(user, "invoice:approve", "invoice", {}, "globex-inc");

for (const rule of trace.evaluatedRules) {
  console.log(rule.rule.id, rule.matched, rule.conditionResults);
}
```

→ Full guide: [Debugging with explain()](../guides/explain-and-debugging.md)

---

## Step 7: Protect an HTTP route (optional)

```typescript
import { guard } from "@siremzam/sentinel/middleware/express";

app.post(
  "/invoices/:id/approve",
  guard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ id: req.params.id }),
    getTenantId: (req) => req.headers["x-tenant-id"] as string,
  }),
  approveHandler,
);
```

The guard calls `evaluate()`; on deny it responds **403** with `decision.reason` unless you customize `onDenied`.

→ [Express guide](../guides/express.md)

---

## What to read next

| Topic | Page |
|---|---|
| Evaluation pipeline | [How evaluation works](../concepts/how-evaluation-works.md) |
| Tenants and strict mode | [Multitenancy](../concepts/multitenancy.md) |
| Role inheritance | [Role hierarchy](../concepts/role-hierarchy.md) |
| UI button visibility | [UI permissions](../guides/ui-permissions.md) |
| Interactive playground | [sentinel-example](https://vegtelenseg.github.io/sentinel-example/) |
