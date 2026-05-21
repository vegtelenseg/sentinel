# What is Sentinel?

[← Documentation home](/) · Next: [Why Sentinel?](./why-sentinel.md)

Sentinel is a **policy engine** for Node.js and TypeScript applications. You define who can do what — in one place, with full type safety — and every part of your stack (HTTP handlers, background jobs, UI) asks the same engine for answers.

It is **not** authentication. Sentinel does not issue sessions, validate JWTs, or manage passwords. You authenticate users elsewhere; Sentinel answers authorization questions: *given this user, this action, and this resource, should access be granted?*

---

## The problem Sentinel solves

Most applications start with scattered checks:

```typescript
if (user.role === "admin" || (user.role === "manager" && invoice.ownerId === user.id)) {
  // allow
}
```

That pattern breaks down quickly:

- **No single source of truth** — the same rule is copy-pasted across routes, services, and GraphQL resolvers.
- **No tenant awareness** — a user who is admin in Org A and viewer in Org B is modeled awkwardly or not at all.
- **No explainability** — when a user says "I should have access," you grep the codebase instead of replaying the decision.
- **CRUD-shaped thinking** — your domain has `invoice:approve` and `project:archive`, but libraries only speak `create` / `read` / `update` / `delete`.

Sentinel replaces those fragments with a **central engine**, **domain-shaped actions**, **built-in multitenancy**, and **`explain()`** traces that show exactly which rule matched.

---

## What Sentinel consists of

Sentinel is a single package with a small, deliberate surface area:

| Piece | Role |
|---|---|
| **`AccessEngine`** | Loads policy rules and evaluates access requests |
| **`RuleBuilder` / `createPolicyFactory`** | Fluent API to define allow and deny rules |
| **`RoleHierarchy`** | Optional role inheritance (admin inherits manager, etc.) |
| **Serialization** | Export/import rules as JSON for database-backed policy stores |
| **Middleware** | Express, Fastify, Hono, NestJS guards — optional subpath imports |
| **`createAuthServer`** | Standalone HTTP microservice for polyglot architectures |

There is **no code generation**, **no DSL file**, and **zero runtime dependencies**. The entire engine is roughly 1,800 lines of TypeScript with a 1:1 test-to-code ratio.

---

## How Sentinel works (at a glance)

Every Sentinel project follows the same shape:

### 1. Define a schema

You declare your roles, resources, and actions once as a TypeScript interface. That schema is not read at runtime for magic — it exists so TypeScript can **propagate types** through policies, `evaluate()` calls, and middleware.

```typescript
interface AppSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "member" | "viewer";
  resources: "invoice" | "project";
  actions: "invoice:approve" | "invoice:read" | "project:archive";
}
```

From this point on, `"invoice:aprove"` is a **compile error**, not a production incident.

### 2. Register policy rules

Rules are plain objects built with a fluent API. Each rule says: for these **roles**, these **actions**, on these **resources**, **allow** or **deny** — optionally when a **condition** passes.

```typescript
engine.addRules(
  allow()
    .roles("admin")
    .actions("invoice:approve")
    .on("invoice")
    .describe("Admins can approve invoices")
    .build(),
);
```

### 3. Evaluate requests

At runtime you pass a **subject** (the user), an **action**, a **resource**, optional **resource context** (attributes of the thing being accessed), and optional **tenant ID**.

```typescript
const decision = engine.evaluate(user, "invoice:approve", "invoice", { id: invoiceId }, tenantId);
if (!decision.allowed) {
  throw new ForbiddenError(decision.reason);
}
```

Every evaluation returns a **`Decision`**: allowed or not, which rule matched, human-readable reason, and timing.

---

## TypeScript as the policy language

Unlike Casbin (model + policy files) or OPA (Rego), Sentinel policies are **TypeScript**. That is intentional:

- Your IDE autocompletes roles and actions.
- Conditions are functions — async database calls, date math, feature flags — not a constrained matcher language.
- Policies live in version control beside application code, reviewed in pull requests like any other logic.

If you need policies editable by non-developers in a admin UI, use [JSON serialization](../guides/json-serialization.md): rules are stored as data; condition *logic* stays in a `ConditionRegistry` in code.

---

## Default security posture

Sentinel is **deny by default**. If no rule matches, access is denied. Conditions that throw are treated as **false** (fail-closed). Rules are **frozen** on `addRule()` so they cannot be mutated after insertion.

See [Security model](./security.md) for the full list of guarantees.

---

## Related pages

- [Why Sentinel?](./why-sentinel.md) — type safety, multitenancy, explainability in depth
- [Quickstart](../getting-started/quickstart.md) — hands-on in five minutes
- [How evaluation works](../concepts/how-evaluation-works.md) — the decision pipeline step by step
- [When not to use Sentinel](./when-not-to-use.md) — honest boundaries
