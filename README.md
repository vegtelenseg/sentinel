# @siremzam/sentinel

**TypeScript-first, domain-driven authorization engine for modern SaaS apps.**

Most Node.js authorization libraries were built in the CRUD era — they model permissions as `create`, `read`, `update`, `delete` on "resources." But modern apps don't think that way. They think in domain verbs: `invoice:approve`, `project:archive`, `user:impersonate`.

This library was built from a different starting point:

- **Your domain actions are not CRUD.** Model `order:ship`, not `update`.
- **Your tenants are not an afterthought.** A user is admin in Tenant A and viewer in Tenant B. That's the default, not an edge case.
- **Your types should work for you.** TypeScript autocompletes your actions, resources, and roles everywhere — policies, checks, middleware.
- **Your authorization decisions should be observable.** Every `allow` and `deny` emits a structured event with timing, reason, and the matched rule.
- **Your policies belong in one place.** Not scattered across 47 route handlers.

**Zero runtime dependencies. ~1,800 lines. 1:1 test-to-code ratio.**

---

## How It Compares

| Feature | **@siremzam/sentinel** | Casbin | accesscontrol | CASL |
|---|---|---|---|---|
| TypeScript-first (full inference) | Yes | Partial | Partial | Yes |
| Domain actions (`invoice:approve`) | Native | Via model config | No (CRUD only) | Via `subject` |
| Multi-tenancy (per-tenant roles) | Built-in | Manual | No | Manual |
| ABAC conditions | Sync + async | Via matchers | No | Via `conditions` |
| Role hierarchy | Built-in, cycle-detected | Via model | Built-in | No |
| Evaluation audit trail | `onDecision` + `toAuditEntry()` | Via watcher | No | No |
| Debug/explain mode | `explain()` with per-rule trace | No | No | No |
| UI permission set | `permitted()` returns `Set` | No | `permission.filter()` | `ability.can()` per action |
| JSON policy storage | `exportRules` / `importRules` + `ConditionRegistry` | CSV / JSON adapters | No | Via `@casl/ability/extra` |
| Server mode (HTTP microservice) | Built-in (`createAuthServer`) | No | No | No |
| Middleware | Express, Fastify, NestJS | Express (community) | Express (community) | Express, NestJS |
| Dependencies | **0** | 2+ | 2 | 1+ |
| DSL required | **No** (pure TypeScript) | Yes (Casbin model) | No | No |

---

## Install

```bash
npm install @siremzam/sentinel
```

---

## Quick Start

### 1. Define your schema

```typescript
import { AccessEngine, createPolicyFactory, RoleHierarchy } from "@siremzam/sentinel";
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

TypeScript now knows every valid role, resource, and action. Autocomplete works everywhere.

### 2. Create the engine and add policies

```typescript
const { allow, deny } = createPolicyFactory<MySchema>();

const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
});

engine.addRules(
  allow()
    .id("admin-full-access")
    .roles("admin", "owner")
    .anyAction()
    .anyResource()
    .describe("Admins and owners have full access")
    .build(),

  allow()
    .id("manager-invoices")
    .roles("manager")
    .actions("invoice:*" as MySchema["actions"])
    .on("invoice")
    .describe("Managers can do anything with invoices")
    .build(),

  allow()
    .id("member-own-invoices")
    .roles("member")
    .actions("invoice:read", "invoice:create")
    .on("invoice")
    .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
    .describe("Members can read/create their own invoices")
    .build(),

  deny()
    .id("no-impersonation")
    .anyRole()
    .actions("user:impersonate")
    .on("user")
    .describe("Nobody can impersonate by default")
    .build(),

  allow()
    .id("owner-impersonate")
    .roles("owner")
    .actions("user:impersonate")
    .on("user")
    .priority(10)
    .describe("Except owners, who can impersonate")
    .build(),
);
```

### 3. Check permissions

```typescript
const user: Subject<MySchema> = {
  id: "user-42",
  roles: [
    { role: "admin", tenantId: "tenant-a" },
    { role: "viewer", tenantId: "tenant-b" },
  ],
};

// Fluent API
const decision = engine.can(user).perform("invoice:approve").on("invoice", {}, "tenant-a");
// decision.allowed === true

// Direct evaluation
const d2 = engine.evaluate(user, "invoice:approve", "invoice", {}, "tenant-b");
// d2.allowed === false (user is only a viewer in tenant-b)
```

### 4. Observe decisions

```typescript
import { toAuditEntry } from "@siremzam/sentinel";

const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  onDecision: (decision) => {
    const entry = toAuditEntry(decision);
    auditLog.write(entry);
  },
});
```

Or subscribe at runtime:

```typescript
const unsubscribe = engine.onDecision((d) => auditLog.write(toAuditEntry(d)));
unsubscribe(); // when done
```

---

## Features

### createPolicyFactory

Eliminates the `<MySchema>` generic parameter on every rule:

```typescript
import { createPolicyFactory } from "@siremzam/sentinel";

const { allow, deny } = createPolicyFactory<MySchema>();

allow().roles("admin").anyAction().anyResource().build();
deny().roles("viewer").actions("report:export").on("report").build();
```

### Strict Tenancy

Prevents accidental cross-tenant access by requiring explicit `tenantId` when the subject has tenant-scoped roles:

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  strictTenancy: true,
});

// THROWS — tenantId is required because user has tenant-scoped roles
engine.evaluate(user, "invoice:read", "invoice");

// OK — explicit tenant context
engine.evaluate(user, "invoice:read", "invoice", {}, "acme");
```

### Condition Error Handling

Conditions that throw are treated as `false` (fail-closed). Surface errors with `onConditionError`:

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  onConditionError: ({ ruleId, conditionIndex, error }) => {
    logger.warn("Condition failed", { ruleId, conditionIndex, error });
  },
});
```

### permitted() — UI Rendering

Ask "what can this user do?" to drive button visibility and menu items:

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

### explain() — Debug Authorization

Full evaluation trace showing every rule, whether it matched, and why:

```typescript
const result = engine.explain(user, "invoice:approve", "invoice");

console.log(result.allowed); // false
console.log(result.reason);  // "No matching rule — default deny"

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

Convert a `Decision` to a serialization-safe format for logging, queuing, or storage:

```typescript
import { toAuditEntry } from "@siremzam/sentinel";

const decision = engine.evaluate(user, "invoice:approve", "invoice");
const entry = toAuditEntry(decision);
// Safe to JSON.stringify — no functions, no circular references
```

### Role Hierarchy

Define that higher roles inherit all permissions of lower roles:

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

engine.addRules(
  allow().id("viewer-read").roles("viewer").actions("invoice:read").on("invoice").build(),
  allow().id("member-create").roles("member").actions("invoice:create").on("invoice").build(),
  allow().id("admin-approve").roles("admin").actions("invoice:approve").on("invoice").build(),
);

// Admins can read (inherited from viewer), create (from member), AND approve (their own)
// Members can read (from viewer) and create, but NOT approve
// Viewers can only read
```

Cycles are detected at definition time and throw immediately.

### Wildcard Action Patterns

Use `*` in action patterns to match groups of actions:

```typescript
// Match all invoice actions
allow().roles("manager").actions("invoice:*" as MySchema["actions"]).on("invoice").build();

// Match all read actions across resources
allow().roles("viewer").actions("*:read" as MySchema["actions"]).anyResource().build();
```

Wildcard patterns are pre-compiled to regexes at `addRule()` time for performance.

### JSON Policy Serialization

Store policies in a database, config file, or load them from an API:

```typescript
import {
  exportRulesToJson,
  importRulesFromJson,
  ConditionRegistry,
} from "@siremzam/sentinel";

// Export rules to JSON
const json = exportRulesToJson(engine.getRules());

// Import rules back (validates effect and id fields)
const rules = importRulesFromJson<MySchema>(json);
engine.addRules(...rules);
```

Conditions use a named registry since functions can't be serialized:

```typescript
const conditions = new ConditionRegistry<MySchema>();
conditions.register("isOwner", (ctx) => ctx.subject.id === ctx.resourceContext.ownerId);
conditions.register("isActive", (ctx) => ctx.resourceContext.status === "active");

const rules = importRulesFromJson<MySchema>(json, conditions);
```

Unknown condition names throw with a helpful error listing available conditions.

### Evaluation Cache

For hot paths where the same subject/action/resource is checked repeatedly:

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

Only unconditional rule evaluations are cached — conditional results are always re-evaluated because they depend on `resourceContext`.

### Server Mode

Run the engine as a standalone HTTP authorization microservice:

```typescript
import { AccessEngine } from "@siremzam/sentinel";
import { createAuthServer } from "@siremzam/sentinel/server";

const engine = new AccessEngine<MySchema>({ schema: {} as MySchema });
engine.addRules(/* ... */);

const server = createAuthServer({
  engine,
  port: 3100,
  authenticate: (req) => {
    return req.headers["x-api-key"] === process.env.AUTH_SERVER_KEY;
  },
  maxBodyBytes: 1024 * 1024, // 1 MB (default)
});

await server.start();
```

**Endpoints:**

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check with rules count and uptime |
| `/rules` | GET | List loaded rules (serialization-safe) |
| `/evaluate` | POST | Evaluate an authorization request |

Zero dependencies. Uses Node's built-in `http` module.

### Middleware

**Express:**

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

**Fastify:**

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

**NestJS:**

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

---

## Security

### Design Principles

- **Deny by default.** If no rule matches, the answer is no.
- **Fail closed.** If a condition throws, it evaluates to `false`. No silent privilege escalation.
- **Frozen rules.** Rules are `Object.freeze`'d on add. Mutation after insertion is impossible.
- **Cache safety.** Only unconditional rule evaluations are cached. Conditional results (which depend on `resourceContext`) are never cached, preventing stale cache entries from granting access.
- **Strict tenancy.** Optional mode that throws if `tenantId` is omitted for subjects with tenant-scoped roles, preventing accidental cross-tenant privilege escalation.
- **Import validation.** `importRulesFromJson()` validates the `effect` field and rejects invalid or missing values.
- **Server hardening.** `createAuthServer` supports an `authenticate` callback (rejects with 401 on failure) and configurable `maxBodyBytes` (default 1 MB) to prevent DoS via oversized request bodies.

### Reporting Vulnerabilities

See [SECURITY.md](./SECURITY.md) for responsible disclosure instructions.

---

## API Reference

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
| `schema` | Your schema type (used for type inference) |
| `defaultEffect` | `"deny"` (default) or `"allow"` |
| `onDecision` | Listener called on every evaluation |
| `onConditionError` | Called when a condition throws (fail-closed) |
| `asyncConditions` | Enable async condition support |
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

---

## Key Concepts

### Domain Actions, Not CRUD

Actions use `resource:verb` format: `invoice:approve`, `order:ship`, `user:impersonate`. Your domain language, not generic CRUD.

### Conditions (ABAC)

Attach predicates to any rule. All conditions on a rule must pass for it to match:

```typescript
allow()
  .roles("member")
  .actions("invoice:update")
  .on("invoice")
  .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
  .when(ctx => ctx.resourceContext.status !== "finalized")
  .build();
```

### Async Conditions

For conditions that need database lookups or API calls:

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  asyncConditions: true,
});

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

### Priority & Deny Resolution

- Higher `priority` wins (default: 0)
- At equal priority, `deny` wins over `allow`
- This lets you create broad deny rules with targeted allow overrides

### Multitenancy

Role assignments are tenant-scoped. When evaluating with a `tenantId`, only roles assigned to that tenant (or globally, with no tenantId) are considered:

```typescript
const user: Subject<MySchema> = {
  id: "user-1",
  roles: [
    { role: "admin", tenantId: "acme-corp" },
    { role: "viewer", tenantId: "globex" },
    { role: "member" }, // global — applies in any tenant
  ],
};
```

---

## Philosophy

1. **Policies belong in one place.** Not scattered across middleware, handlers, and services.
2. **Authorization is not authentication.** This library does not care how you identify users. It cares what they're allowed to do.
3. **Types are documentation.** If your IDE can't autocomplete it, the API is wrong.
4. **Every decision is observable.** If you can't audit it, you can't trust it.
5. **Deny by default.** If no rule matches, the answer is no.
6. **Fail closed.** If a condition throws, the answer is no.
7. **Zero dependencies.** The core engine, server, and middleware use nothing outside Node.js built-ins.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
