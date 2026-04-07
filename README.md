# @siremzam/sentinel

[![npm version](https://img.shields.io/npm/v/@siremzam/sentinel)](https://www.npmjs.com/package/@siremzam/sentinel)
[![CI](https://github.com/vegtelenseg/sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/vegtelenseg/sentinel/actions/workflows/ci.yml)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@siremzam/sentinel)
[![license](https://img.shields.io/npm/l/@siremzam/sentinel)](./LICENSE)

**All your permission logic in one place. Type-safe. Multi-tenant. Explainable.**

Most auth libraries give you `create`, `read`, `update`, `delete` and call it a day. But your app has `invoice:approve`, your users are admin in one tenant and viewer in another, and when access breaks, nobody can tell you why without grepping the entire codebase.

Sentinel replaces scattered role checks with a single policy engine — domain actions instead of CRUD, tenant-scoped roles by default, and every decision tells you exactly which rule matched and why.

Zero dependencies. ~1,800 lines. 1:1 test-to-code ratio.

---

### Before and after

**Without Sentinel** — scattered, fragile, no tenant awareness:

```typescript
app.post("/invoices/:id/approve", async (req, res) => {
  if (
    user.role === "admin" ||
    (user.role === "manager" && invoice.ownerId === user.id)
  ) {
    // which tenant? who knows
    // why was this allowed? good luck
  }
});
```

**With Sentinel** — centralized, type-safe, explainable:

```typescript
app.post(
  "/invoices/:id/approve",
  guard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ ownerId: req.params.id }),
    getTenantId: (req) => req.headers["x-tenant-id"],
  }),
  handler,
);
```

---

## Install

```bash
npm install @siremzam/sentinel
```

## Quick Start

### 1. Define your schema (TypeScript does the rest)

```typescript
import { AccessEngine, createPolicyFactory } from "@siremzam/sentinel";
import type { SchemaDefinition, Subject } from "@siremzam/sentinel";

interface MySchema extends SchemaDefinition {
  roles: "owner" | "admin" | "manager" | "member" | "viewer";
  resources: "invoice" | "project" | "user";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:approve"
    | "invoice:send"
    | "project:read"
    | "project:archive"
    | "user:read"
    | "user:impersonate";
}
```

Every role, resource, and action gets autocomplete and compile-time validation. Typos are caught before your code runs.

### 2. Write policies that read like English

```typescript
const { allow, deny } = createPolicyFactory<MySchema>();

const engine = new AccessEngine<MySchema>({ schema: {} as MySchema });

engine.addRules(
  allow()
    .roles("admin", "owner")
    .anyAction()
    .anyResource()
    .describe("Admins and owners have full access")
    .build(),

  allow()
    .roles("manager")
    .actions("invoice:*" as MySchema["actions"])
    .on("invoice")
    .describe("Managers can do anything with invoices")
    .build(),

  allow()
    .roles("member")
    .actions("invoice:read", "invoice:create")
    .on("invoice")
    .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
    .describe("Members can read/create their own invoices")
    .build(),
);
```

### 3. Check permissions (with tenant context)

```typescript
const user: Subject<MySchema> = {
  id: "user-42",
  roles: [
    { role: "admin", tenantId: "tenant-a" },
    { role: "viewer", tenantId: "tenant-b" },
  ],
};

engine.evaluate(user, "invoice:approve", "invoice", {}, "tenant-a");
// → allowed: true (user is admin in tenant-a)

engine.evaluate(user, "invoice:approve", "invoice", {}, "tenant-b");
// → allowed: false (user is only a viewer in tenant-b)
```

That's it. You're up and running.

> **[Try it live in the interactive playground →](https://vegtelenseg.github.io/sentinel-example/)**
>
> Policy editor, multi-tenant evaluation, explain traces, and audit log — all in the browser. ([source](https://github.com/vegtelenseg/sentinel-example))

---

## Why Sentinel?

### 1. Type-safe schema

Your IDE autocompletes `invoice:approve` and rejects `invoice:aprove`. Every policy, condition, and middleware call is type-checked at compile time. This isn't convenience — it's a security boundary.

```typescript
// TypeScript catches this at compile time, not in production
engine.evaluate(user, "invoice:aprove", "invoice");
//                     ^^^^^^^^^^^^^^^^ — Type error
```

### 2. Multi-tenancy that doesn't leak

Roles are scoped to tenants in the data model itself. No middleware hacks. No "effective role" workarounds. And `strictTenancy` mode throws if you forget the tenant ID — so cross-tenant bugs surface in development, not from a customer email on Friday.

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  strictTenancy: true, // forget tenantId? this throws, not leaks
});
```

### 3. explain() — debug authorization in seconds

When a user reports "I can't access this," don't grep your codebase. Replay the decision:

```typescript
const result = engine.explain(user, "invoice:approve", "invoice", {}, "tenant-b");
// result.allowed → false
// result.reason → "No matching rule — default deny"
// result.evaluatedRules → per-rule trace: which matched on role, action, resource, conditions
```

Every evaluation also emits a structured audit event via `onDecision` — who asked, what for, which rule decided it, how long it took.

### 4. Domain actions, not CRUD

`invoice:approve`. `project:archive`. `user:impersonate`. Your authorization speaks your domain language, not `create`/`read`/`update`/`delete`.

---

<details>
<summary><strong>How it compares</strong></summary>

| Feature | **Sentinel** | Casbin | accesscontrol | CASL |
|---|---|---|---|---|
| TypeScript-first (full inference) | Yes | Partial | Partial | Yes |
| Domain actions (`invoice:approve`) | Native | Via model config | No (CRUD only) | Via `subject` |
| Multi-tenancy (per-tenant roles) | Built-in | Manual | No | Manual |
| ABAC conditions | Sync + async | Via matchers | No | Via `conditions` |
| Role hierarchy | Built-in, cycle-detected | Via model | Built-in | No |
| Audit trail | `onDecision` + `toAuditEntry()` | Via watcher | No | No |
| Debug/explain | `explain()` with per-rule trace | No | No | No |
| UI permission set | `permitted()` returns `Set` | No | `permission.filter()` | `ability.can()` per action |
| JSON policy storage | `exportRules` / `importRules` | CSV / JSON adapters | No | Via `@casl/ability/extra` |
| Server mode (HTTP microservice) | Built-in | No | No | No |
| Middleware | Express, Fastify, Hono, NestJS | Express (community) | Express (community) | Express, NestJS |
| Dependencies | **0** | 2+ | 2 | 1+ |
| DSL required | **No** (pure TypeScript) | Yes | No | No |

</details>

---

## Docs

### Everything below is organized by topic. Click to expand what you need.

<details>
<summary><strong>How evaluation works</strong></summary>

When you call `engine.evaluate(subject, action, resource, context?, tenantId?)`:

```
1. Resolve the subject's roles
   └─ Filter role assignments by tenantId (if provided)
   └─ Expand via role hierarchy (if configured)

2. Find candidate rules
   └─ For each rule: does role match? action match? resource match?
   └─ Wildcard patterns ("invoice:*") are pre-compiled to regex at addRule() time

3. Sort candidates
   └─ Higher priority first
   └─ At equal priority, deny rules sort before allow rules

4. Evaluate candidates in order (first match wins)
   └─ No conditions? → rule matches immediately
   └─ Has conditions? → all conditions must return true
   └─ Condition throws? → treated as false (fail-closed)

5. Return decision
   └─ Matched rule found → use its effect (allow or deny)
   └─ No match → default deny
```

Every decision includes the matched rule (or null), a human-readable reason, evaluation duration, and full request context.

</details>

<details>
<summary><strong>Concepts glossary</strong></summary>

| Term | Meaning |
|---|---|
| **RBAC** | Role-Based Access Control. Permissions are assigned to roles, users are assigned roles. |
| **ABAC** | Attribute-Based Access Control. Permissions depend on attributes of the subject, resource, or environment — expressed as conditions. |
| **Subject** | The entity requesting access — typically a user. Has an `id` and an array of `roles`. |
| **Resource** | The thing being accessed — `"invoice"`, `"project"`, `"user"`. |
| **Action** | What the subject wants to do — `"invoice:approve"`, `"project:archive"`. Uses `resource:verb` format. |
| **Policy Rule** | A single authorization rule with an effect (`allow` or `deny`), and optionally conditions, priority, and a description. |
| **Condition** | A function attached to a rule that receives the evaluation context and returns `true`/`false`. Used for ABAC. |
| **Tenant** | An organizational unit in a multi-tenant system. Users can have different roles in different tenants. |
| **Decision** | The result of an evaluation — contains `allowed`, the matched rule, timing, and a human-readable reason. |
| **Priority** | A number (default 0) that determines rule evaluation order. Higher priority rules are checked first. |
| **Role Hierarchy** | A definition that one role inherits all permissions of another — e.g., `admin` inherits from `manager`. |

</details>

<details>
<summary><strong>Core features</strong></summary>

### Policy Factory

`createPolicyFactory` eliminates the `<MySchema>` generic on every rule:

```typescript
const { allow, deny } = createPolicyFactory<MySchema>();

allow().roles("admin").anyAction().anyResource().build();
deny().roles("viewer").actions("report:export").on("report").build();
```

### Conditions (ABAC)

Attach predicates to any rule. All conditions on a rule must pass:

```typescript
allow()
  .roles("member")
  .actions("invoice:update")
  .on("invoice")
  .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
  .when(ctx => ctx.resourceContext.status !== "finalized")
  .build();
```

Conditions receive the full `EvaluationContext` — subject, action, resource, resourceContext, and tenantId. Stack multiple `.when()` calls; they are AND'd together.

### Async Conditions

For conditions that need database lookups or API calls:

```typescript
engine.addRule(
  allow()
    .roles("member")
    .actions("report:export")
    .on("report")
    .when(async (ctx) => {
      const quota = await db.getExportQuota(ctx.subject.id);
      return quota.remaining > 0;
    })
    .build(),
);

const decision = await engine.evaluateAsync(user, "report:export", "report");
```

Use `evaluateAsync()`, `permittedAsync()`, and `explainAsync()` for async conditions. The engine throws a clear error if you accidentally use the sync API with async conditions.

### Wildcard Action Patterns

```typescript
allow().roles("manager").actions("invoice:*" as MySchema["actions"]).on("invoice").build();
allow().roles("viewer").actions("*:read" as MySchema["actions"]).anyResource().build();
```

Wildcards are pre-compiled to regexes at `addRule()` time — no per-evaluation cost.

### Role Hierarchy

```typescript
import { RoleHierarchy } from "@siremzam/sentinel";

const hierarchy = new RoleHierarchy<MySchema>()
  .define("owner", ["admin"])
  .define("admin", ["manager"])
  .define("manager", ["member"])
  .define("member", ["viewer"]);

const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  roleHierarchy: hierarchy,
});
```

Cycles are detected at definition time and throw immediately.

### Priority and Deny Resolution

- Higher `priority` wins (default: 0)
- At equal priority, `deny` wins over `allow`

```typescript
deny().anyRole().actions("user:impersonate").on("user").build();
allow().roles("owner").actions("user:impersonate").on("user").priority(10).build();
```

### Multitenancy

Role assignments are tenant-scoped. When evaluating with a `tenantId`, only roles for that tenant (or global roles) are considered:

```typescript
const user: Subject<MySchema> = {
  id: "user-1",
  roles: [
    { role: "admin", tenantId: "acme-corp" },
    { role: "viewer", tenantId: "globex" },
    { role: "member" }, // global — applies in any tenant
  ],
};

engine.evaluate(user, "invoice:approve", "invoice", {}, "acme-corp");
// admin + member roles

engine.evaluate(user, "invoice:approve", "invoice", {}, "globex");
// viewer + member roles
```

### Strict Tenancy

Prevents accidental cross-tenant access:

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  strictTenancy: true,
});

engine.evaluate(user, "invoice:read", "invoice");
// THROWS — tenantId required for tenant-scoped subjects
```

### Condition Error Handling

Conditions that throw are treated as `false` (fail-closed):

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  onConditionError: ({ ruleId, conditionIndex, error }) => {
    logger.warn("Condition failed", { ruleId, conditionIndex, error });
  },
});
```

</details>

<details>
<summary><strong>Observability</strong></summary>

### Decision Events

Every evaluation emits a structured `Decision` event:

```typescript
import { toAuditEntry } from "@siremzam/sentinel";

const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  onDecision: (decision) => {
    const entry = toAuditEntry(decision);
    auditLog.write(entry);
  },
});

// Or subscribe at runtime
const unsubscribe = engine.onDecision((d) => auditLog.write(toAuditEntry(d)));
unsubscribe();
```

### explain() — Debug Authorization

Full evaluation trace showing every rule, whether it matched, and why:

```typescript
const result = engine.explain(user, "invoice:approve", "invoice");

console.log(result.allowed);
console.log(result.reason);

for (const evalRule of result.evaluatedRules) {
  console.log({
    ruleId: evalRule.rule.id,
    roleMatched: evalRule.roleMatched,
    actionMatched: evalRule.actionMatched,
    resourceMatched: evalRule.resourceMatched,
    conditionResults: evalRule.conditionResults,
    matched: evalRule.matched,
  });
}
```

For async conditions, use `engine.explainAsync()`.

### toAuditEntry()

Convert a `Decision` to a serialization-safe format:

```typescript
const decision = engine.evaluate(user, "invoice:approve", "invoice");
const entry = toAuditEntry(decision);
// Safe to JSON.stringify — no functions, no circular references
```

### permitted() — UI Rendering

Drive button visibility and menu items:

```typescript
const actions = engine.permitted(
  user,
  "invoice",
  ["invoice:create", "invoice:read", "invoice:approve", "invoice:send"],
  { ownerId: user.id },
  "tenant-a",
);
// Set { "invoice:create", "invoice:read" }
```

For async conditions, use `engine.permittedAsync()`.

</details>

<details>
<summary><strong>Integration & middleware</strong></summary>

### Express

```typescript
import { guard } from "@siremzam/sentinel/middleware/express";

app.post(
  "/invoices/:id/approve",
  guard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ id: req.params.id }),
    getTenantId: (req) => req.headers["x-tenant-id"],
  }),
  handler,
);
```

### Fastify

```typescript
import { fastifyGuard } from "@siremzam/sentinel/middleware/fastify";

fastify.post("/invoices/:id/approve", {
  preHandler: fastifyGuard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ id: req.params.id }),
    getTenantId: (req) => req.headers["x-tenant-id"],
  }),
}, handler);
```

### Hono

```typescript
import { honoGuard } from "@siremzam/sentinel/middleware/hono";

app.post(
  "/invoices/:id/approve",
  honoGuard(engine, "invoice:approve", "invoice", {
    getSubject: (c) => c.get("user"),
    getResourceContext: (c) => ({ id: c.req.param("id") }),
    getTenantId: (c) => c.req.header("x-tenant-id"),
  }),
  handler,
);
```

### NestJS

```typescript
import {
  createAuthorizeDecorator,
  createAuthGuard,
} from "@siremzam/sentinel/middleware/nestjs";

const Authorize = createAuthorizeDecorator<MySchema>();

const AuthGuard = createAuthGuard<MySchema>({
  engine,
  getSubject: (req) => req.user as Subject<MySchema>,
  getTenantId: (req) => req.headers["x-tenant-id"] as string,
});

@Controller("invoices")
class InvoiceController {
  @Post(":id/approve")
  @Authorize("invoice:approve", "invoice")
  approve(@Param("id") id: string) {
    return { approved: true };
  }
}

app.useGlobalGuards(new AuthGuard());
```

No dependency on `@nestjs/common` or `reflect-metadata`. Uses a WeakMap for metadata storage.

### Server Mode

Run the engine as a standalone HTTP authorization microservice for polyglot architectures:

```typescript
import { createAuthServer } from "@siremzam/sentinel/server";

const server = createAuthServer({
  engine,
  port: 3100,
  authenticate: (req) => req.headers["x-api-key"] === process.env.AUTH_SERVER_KEY,
  maxBodyBytes: 1024 * 1024,
});

await server.start();
```

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check with rules count and uptime |
| `/rules` | GET | List loaded rules (serialization-safe) |
| `/evaluate` | POST | Evaluate an authorization request |

Zero dependencies. Uses Node's built-in `http` module.

### JSON Policy Serialization

Store policies in a database, config file, or load from an API:

```typescript
import {
  exportRulesToJson,
  importRulesFromJson,
  ConditionRegistry,
} from "@siremzam/sentinel";

const json = exportRulesToJson(engine.getRules());
const rules = importRulesFromJson<MySchema>(json);
engine.addRules(...rules);
```

Conditions use a named registry since functions can't be serialized:

```typescript
const conditions = new ConditionRegistry<MySchema>();
conditions.register("isOwner", (ctx) => ctx.subject.id === ctx.resourceContext.ownerId);

const rules = importRulesFromJson<MySchema>(json, conditions);
```

</details>

<details>
<summary><strong>Performance & benchmarks</strong></summary>

### Evaluation Cache

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  cacheSize: 1000,
});

engine.evaluate(user, "invoice:read", "invoice"); // evaluated
engine.evaluate(user, "invoice:read", "invoice"); // cache hit

engine.addRule(newRule); // cache cleared automatically
engine.clearCache();     // manual control
engine.cacheStats;       // { size: 0, maxSize: 1000 }
```

Only unconditional evaluations are cached — conditional results are always re-evaluated.

### Benchmarks

Measured on Node v18.18.0, Apple Silicon (ARM64). Run `npm run benchmark` to reproduce.

| Scenario | 100 rules | 1,000 rules | 10,000 rules |
|---|---|---|---|
| `evaluate` (no cache) | 4.3 µs / 231k ops/s | 42.6 µs / 23k ops/s | 1,091 µs / 917 ops/s |
| `evaluate` (cache hit) | 0.6 µs / 1.66M ops/s | 1.8 µs / 553k ops/s | 29.1 µs / 34k ops/s |
| `evaluate` (all conditional) | 3.4 µs / 292k ops/s | 40.2 µs / 25k ops/s | 1,064 µs / 940 ops/s |
| `permitted` (18 actions) | 60.2 µs / 17k ops/s | 718 µs / 1.4k ops/s | 18,924 µs / 53 ops/s |
| `explain` (full trace) | 22.4 µs / 45k ops/s | 564 µs / 1.8k ops/s | 6,444 µs / 155 ops/s |

Most SaaS apps have 10–50 rules. At 100 rules, a single evaluation takes **4.3 µs** — 230,000 checks per second on a single core. With caching: **0.6 µs**.

</details>

<details>
<summary><strong>Patterns & recipes</strong></summary>

### Ownership — "Users can only edit their own resources"

```typescript
allow()
  .roles("member")
  .actions("invoice:update")
  .on("invoice")
  .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
  .build();
```

### Time-Gated Access — "Trial expires after 14 days"

```typescript
allow()
  .roles("trial")
  .actions("report:export")
  .on("report")
  .when(ctx => {
    const createdAt = new Date(ctx.resourceContext.trialStartedAt as string);
    const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 14;
  })
  .build();
```

### Feature Flags — "Beta feature for specific tenants"

```typescript
const BETA_TENANTS = new Set(["acme-corp", "initech"]);

allow()
  .anyRole()
  .actions("analytics:view")
  .on("analytics")
  .when(ctx => BETA_TENANTS.has(ctx.tenantId ?? ""))
  .build();
```

### Async Conditions — "Check external quota service"

```typescript
allow()
  .roles("member")
  .actions("api:call")
  .on("api")
  .when(async ctx => {
    const usage = await rateLimiter.check(ctx.subject.id);
    return usage.remaining > 0;
  })
  .build();
```

### Broad Deny with Targeted Override

```typescript
deny()
  .anyRole()
  .actions("project:delete", "project:archive")
  .on("project")
  .build();

allow()
  .roles("owner")
  .actions("project:delete", "project:archive")
  .on("project")
  .priority(10)
  .build();
```

### IP-Based Restriction

```typescript
allow()
  .roles("admin")
  .actions("settings:update")
  .on("settings")
  .when(async ctx => {
    const ip = ctx.resourceContext.clientIp as string;
    const geo = await geoService.lookup(ip);
    return geo.isOfficeNetwork;
  })
  .build();
```

</details>

<details>
<summary><strong>Testing your policies</strong></summary>

```typescript
import { describe, it, expect } from "vitest";

describe("invoice policies", () => {
  it("allows managers to approve invoices in their tenant", () => {
    const result = engine.explain(manager, "invoice:approve", "invoice", {}, "acme");

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("manager-invoices");
  });

  it("denies viewers from approving invoices", () => {
    const result = engine.explain(viewer, "invoice:approve", "invoice", {}, "acme");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("No matching rule — default deny");
  });

  it("respects ownership conditions", () => {
    const result = engine.explain(
      member,
      "invoice:read",
      "invoice",
      { ownerId: "someone-else" },
      "acme",
    );

    const ownershipRule = result.evaluatedRules.find(
      e => e.rule.id === "member-own-invoices",
    );
    expect(ownershipRule?.conditionResults[0]?.passed).toBe(false);
  });

  it("prevents cross-tenant access", () => {
    const resultAcme = engine.evaluate(user, "invoice:approve", "invoice", {}, "acme");
    const resultGlobex = engine.evaluate(user, "invoice:approve", "invoice", {}, "globex");

    expect(resultAcme.allowed).toBe(true);
    expect(resultGlobex.allowed).toBe(false);
  });
});
```

`explain()` returns per-rule evaluation details — which rules matched on role, action, and resource, and which conditions passed or failed. When a test fails, the trace tells you exactly *why*.

</details>

<details>
<summary><strong>Migration guides</strong></summary>

### Coming from CASL

| CASL | Sentinel |
|---|---|
| `defineAbility(can => { can('read', 'Article') })` | `allow().actions("article:read").on("article").build()` |
| `ability.can('read', 'Article')` | `engine.evaluate(user, "article:read", "article")` |
| `subject('Article', article)` | Actions use `resource:verb` format natively |
| `conditions: { authorId: user.id }` | `.when(ctx => ctx.subject.id === ctx.resourceContext.authorId)` |
| No multi-tenancy | Built-in: `{ role: "admin", tenantId: "acme" }` |
| No explain/debug | `engine.explain()` gives per-rule trace |

**Key difference:** CASL uses MongoDB-style conditions (declarative objects). Sentinel uses functions — async calls, date math, external lookups — with compile-time type safety.

### Coming from Casbin

| Casbin | Sentinel |
|---|---|
| Model file (`model.conf`) | Pure TypeScript schema interface |
| Policy file (`policy.csv`) | Fluent builder API or JSON import |
| `e.Enforce("alice", "data1", "read")` | `engine.evaluate(user, "data:read", "data")` |
| Custom matchers for ABAC | `.when()` conditions with full TypeScript |
| Role manager | `RoleHierarchy` with cycle detection |

**Key difference:** Casbin requires its own DSL. Sentinel is pure TypeScript — your IDE autocompletes everything.

### Coming from accesscontrol

| accesscontrol | Sentinel |
|---|---|
| `ac.grant('admin').createAny('video')` | `allow().roles("admin").actions("video:create").on("video").build()` |
| CRUD only | Domain verbs: `invoice:approve`, `order:ship` |
| No conditions/ABAC | Full ABAC with `.when()` conditions |
| No multi-tenancy | Built-in per-tenant role assignments |

**Key difference:** accesscontrol is locked into CRUD semantics. Sentinel treats domain verbs as first-class.

</details>

<details>
<summary><strong>API reference</strong></summary>

### AccessEngine\<S\>

| Method | Description |
|---|---|
| `addRule(rule)` | Add a single policy rule (frozen on add) |
| `addRules(...rules)` | Add multiple rules |
| `removeRule(id)` | Remove a rule by ID |
| `getRules()` | Get all rules (frozen, readonly) |
| `clearRules()` | Remove all rules |
| `evaluate(subject, action, resource, ctx?, tenantId?)` | Synchronous evaluation |
| `evaluateAsync(...)` | Async evaluation (for async conditions) |
| `permitted(subject, resource, actions, ctx?, tenantId?)` | Which actions are allowed? Returns `Set` |
| `permittedAsync(...)` | Async version of `permitted()` |
| `explain(subject, action, resource, ctx?, tenantId?)` | Full evaluation trace |
| `explainAsync(...)` | Async version of `explain()` |
| `can(subject)` | Start fluent check chain |
| `onDecision(listener)` | Subscribe to decisions, returns unsubscribe fn |
| `allow()` / `deny()` | Shorthand rule builders |
| `clearCache()` | Clear the evaluation cache |
| `cacheStats` | `{ size, maxSize }` or `null` if caching disabled |

### AccessEngineOptions\<S\>

| Option | Description |
|---|---|
| `schema` | Your schema type (used for type inference, not read at runtime) |
| `defaultEffect` | `"deny"` (default) or `"allow"` |
| `onDecision` | Listener called on every evaluation |
| `onConditionError` | Called when a condition throws (fail-closed) |
| `strictTenancy` | Throw if tenantId is omitted for tenant-scoped subjects |
| `roleHierarchy` | A `RoleHierarchy` instance |
| `cacheSize` | LRU cache capacity (0 = disabled) |

### RuleBuilder\<S\>

| Method | Description |
|---|---|
| `.id(id)` | Set rule ID |
| `.roles(...roles)` | Restrict to specific roles |
| `.anyRole()` | Match any role |
| `.actions(...actions)` | Restrict to specific actions (supports `*` wildcards) |
| `.anyAction()` | Match any action |
| `.on(...resources)` | Restrict to specific resources |
| `.anyResource()` | Match any resource |
| `.when(condition)` | Add a condition (stackable) |
| `.priority(n)` | Set priority (higher wins) |
| `.describe(text)` | Human-readable description |
| `.build()` | Produce the `PolicyRule` object |

### RoleHierarchy\<S\>

| Method | Description |
|---|---|
| `.define(role, inheritsFrom)` | Define inheritance (detects cycles) |
| `.resolve(role)` | Get full set of roles including inherited |
| `.resolveAll(roles)` | Resolve multiple roles merged |
| `.definedRoles()` | List roles with inheritance rules |

### ConditionRegistry\<S\>

| Method | Description |
|---|---|
| `.register(name, fn)` | Register a named condition |
| `.get(name)` | Look up a condition |
| `.has(name)` | Check if registered |
| `.names()` | List all registered names |

### Decision\<S\>

Every evaluation returns a `Decision` containing:

- `allowed` — boolean result
- `effect` — `"allow"`, `"deny"`, or `"default-deny"`
- `matchedRule` — the rule that determined the outcome (or null)
- `reason` — human-readable explanation
- `durationMs` — evaluation time
- `timestamp` — when the decision was made
- Full request context (subject, action, resource, tenantId)

### AuditEntry

Serialization-safe version of `Decision` via `toAuditEntry()`:

- `allowed`, `effect`, `reason`, `durationMs`, `timestamp`
- `matchedRuleId`, `matchedRuleDescription`
- `subjectId`, `action`, `resource`, `tenantId`

### ExplainResult\<S\>

Returned by `engine.explain()`:

- `allowed`, `effect`, `reason`, `durationMs`
- `evaluatedRules` — array of `RuleEvaluation<S>` with per-rule and per-condition details

</details>

---

## When NOT to use this

- **You need a full policy language.** If you want Rego (OPA) or Cedar (AWS), this isn't that. Sentinel policies are TypeScript code.
- **You need Zanzibar-style relationship graphs.** For "who can access this Google Doc?" with nested sharing, use [SpiceDB](https://authzed.com/) or [OpenFGA](https://openfga.dev/).
- **You need a hosted authorization service.** Look at [Permit.io](https://permit.io/) or [Oso Cloud](https://www.osohq.com/).
- **Your model is truly just CRUD.** If `create`/`read`/`update`/`delete` is all you need with no tenants, simpler libraries may suffice.

## Security

- **Deny by default.** No rule match = no access.
- **Fail closed.** Condition throws = `false`. No silent privilege escalation.
- **Frozen rules.** Rules are `Object.freeze`'d on add. Mutation after insertion is impossible.
- **Cache safety.** Only unconditional evaluations are cached. Conditional results are never cached.
- **Strict tenancy.** Throws if `tenantId` is omitted for tenant-scoped subjects.
- **Import validation.** `importRulesFromJson()` validates the `effect` field and rejects invalid values.
- **Server hardening.** `createAuthServer` supports `authenticate` callback and configurable `maxBodyBytes`.

See [SECURITY.md](./SECURITY.md) for responsible disclosure.

## What's New in 0.4.1

- **Async conditions without opt-in** — No more `asyncConditions: true` flag. Use `evaluateAsync()`, `explainAsync()`, or `permittedAsync()` when you have async conditions; the engine detects them automatically.
- `asyncConditions` option deprecated (will be removed in v2)

See the full [CHANGELOG](./CHANGELOG.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
