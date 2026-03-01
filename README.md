# @siremzam/sentinel

[![npm version](https://img.shields.io/npm/v/@siremzam/sentinel)](https://www.npmjs.com/package/@siremzam/sentinel)
[![CI](https://github.com/vegtelenseg/sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/vegtelenseg/sentinel/actions/workflows/ci.yml)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@siremzam/sentinel)
[![license](https://img.shields.io/npm/l/@siremzam/sentinel)](./LICENSE)

**TypeScript-first, domain-driven authorization engine for modern SaaS apps.**

Most Node.js authorization libraries were built in the CRUD era — they model permissions as `create`, `read`, `update`, `delete` on "resources." But modern apps don't think that way. They think in domain verbs: `invoice:approve`, `project:archive`, `user:impersonate`.

This library was built from a different starting point:

- **Your domain actions are not CRUD.** Model `order:ship`, not `update`.
- **Your tenants are not an afterthought.** A user is admin in Tenant A and viewer in Tenant B. That's the default, not an edge case.
- **Your types should work for you.** TypeScript autocompletes your actions, resources, and roles everywhere — policies, checks, middleware.
- **Your authorization decisions should be observable.** Every `allow` and `deny` emits a structured event with timing, reason, and the matched rule.
- **Your policies belong in one place.** Not scattered across 47 route handlers.

**Zero runtime dependencies. ~1,800 lines. 1:1 test-to-code ratio.**

> ### Try it live
>
> **[Open the interactive playground →](https://vegtelenseg.github.io/sentinel-example/)**
>
> Policy editor, multi-tenant evaluation, explain traces, and audit log — all in the browser.
> ([source](https://github.com/vegtelenseg/sentinel-example))

---

### What's New in 0.3.2

- README rewrite: evaluation walkthrough, concepts glossary, patterns & recipes, migration guide, benchmark data
- Standalone example (`examples/standalone/`) — no HTTP server needed
- "When NOT to Use This" and "Testing Your Policies" sections

See the full [CHANGELOG](./CHANGELOG.md).

---

## Table of Contents

- [How It Compares](#how-it-compares)
- [Install](#install)
- [Quick Start](#quick-start)
- [How Evaluation Works](#how-evaluation-works)
- [Concepts](#concepts)
- [Core Features](#core-features)
  - [Policy Factory](#policy-factory)
  - [Conditions (ABAC)](#conditions-abac)
  - [Async Conditions](#async-conditions)
  - [Wildcard Action Patterns](#wildcard-action-patterns)
  - [Role Hierarchy](#role-hierarchy)
  - [Priority and Deny Resolution](#priority-and-deny-resolution)
  - [Multitenancy](#multitenancy)
  - [Strict Tenancy](#strict-tenancy)
  - [Condition Error Handling](#condition-error-handling)
- [Observability](#observability)
  - [Decision Events](#decision-events)
  - [explain() — Debug Authorization](#explain--debug-authorization)
  - [toAuditEntry()](#toauditentry)
  - [permitted() — UI Rendering](#permitted--ui-rendering)
- [Integration](#integration)
  - [Middleware (Express, Fastify, NestJS)](#middleware)
  - [Server Mode](#server-mode)
  - [JSON Policy Serialization](#json-policy-serialization)
- [Performance](#performance)
  - [Evaluation Cache](#evaluation-cache)
  - [Benchmarks](#benchmarks)
- [Patterns and Recipes](#patterns-and-recipes)
- [Testing Your Policies](#testing-your-policies)
- [Migration Guide](#migration-guide)
- [When NOT to Use This](#when-not-to-use-this)
- [Security](#security)
- [API Reference](#api-reference)
- [Philosophy](#philosophy)
- [Contributing](#contributing)
- [License](#license)

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
```

> **Why `{} as MySchema`?** The `schema` field exists purely for TypeScript inference — it carries your type information through the engine at compile time. The runtime value is never read. Think of it as a type witness, not data.

```typescript
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

> **[Open the playground →](https://vegtelenseg.github.io/sentinel-example/)** to see all of this running interactively.

---

## How Evaluation Works

When you call `engine.evaluate(subject, action, resource, context?, tenantId?)`, the engine runs this algorithm:

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

Every decision includes the matched rule (or null), a human-readable reason, evaluation duration, and full request context. Decisions with only unconditional rule matches are eligible for LRU caching.

---

## Concepts

If you're new to authorization systems, here's a quick glossary:

<details>
<summary><strong>Expand glossary</strong></summary>

| Term | Meaning |
|---|---|
| **RBAC** | Role-Based Access Control. Permissions are assigned to roles, users are assigned roles. |
| **ABAC** | Attribute-Based Access Control. Permissions depend on attributes of the subject, resource, or environment — expressed as conditions. |
| **Subject** | The entity requesting access — typically a user. Has an `id` and an array of `roles`. |
| **Resource** | The thing being accessed — `"invoice"`, `"project"`, `"user"`. |
| **Action** | What the subject wants to do to the resource — `"invoice:approve"`, `"project:archive"`. Uses `resource:verb` format. |
| **Policy Rule** | A single authorization rule: "allow managers to perform invoice:approve on invoice." Has an effect (`allow` or `deny`), and optionally conditions, priority, and a description. |
| **Condition** | A function attached to a rule that receives the evaluation context and returns `true` or `false`. Used for ABAC — e.g., "only if the user owns the resource." |
| **Tenant** | An organizational unit in a multi-tenant system (e.g., a company). Users can have different roles in different tenants. |
| **Decision** | The result of evaluating a request — contains `allowed`, the matched rule, timing, and a human-readable reason. |
| **Effect** | Either `"allow"` or `"deny"`. Determines what happens when a rule matches. |
| **Priority** | A number (default 0) that determines rule evaluation order. Higher priority rules are checked first. |
| **Role Hierarchy** | A definition that one role inherits all permissions of another — e.g., `admin` inherits from `manager`. |

</details>

---

## Core Features

### Policy Factory

`createPolicyFactory` eliminates the `<MySchema>` generic parameter on every rule:

```typescript
import { createPolicyFactory } from "@siremzam/sentinel";

const { allow, deny } = createPolicyFactory<MySchema>();

allow().roles("admin").anyAction().anyResource().build();
deny().roles("viewer").actions("report:export").on("report").build();
```

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

Conditions receive the full `EvaluationContext` — subject, action, resource, resourceContext, and tenantId. Stack multiple `.when()` calls; they are AND'd together.

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

When `asyncConditions` is enabled, use `evaluateAsync()`, `permittedAsync()`, and `explainAsync()` instead of their synchronous counterparts.

### Wildcard Action Patterns

Use `*` in action patterns to match groups of actions:

```typescript
// Match all invoice actions
allow().roles("manager").actions("invoice:*" as MySchema["actions"]).on("invoice").build();

// Match all read actions across resources
allow().roles("viewer").actions("*:read" as MySchema["actions"]).anyResource().build();
```

Wildcard patterns are pre-compiled to regexes at `addRule()` time — no per-evaluation regex cost.

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

### Priority and Deny Resolution

- Higher `priority` wins (default: 0)
- At equal priority, `deny` wins over `allow`
- This lets you create broad deny rules with targeted allow overrides

```typescript
// Deny impersonation for everyone at priority 0
deny().anyRole().actions("user:impersonate").on("user").build();

// Allow it for owners at priority 10 — this wins
allow().roles("owner").actions("user:impersonate").on("user").priority(10).build();
```

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

// In acme-corp context: user has admin + member roles
engine.evaluate(user, "invoice:approve", "invoice", {}, "acme-corp");

// In globex context: user has viewer + member roles
engine.evaluate(user, "invoice:approve", "invoice", {}, "globex");
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

---

## Observability

### Decision Events

Every evaluation emits a structured `Decision` event. Subscribe at construction or at runtime:

```typescript
import { toAuditEntry } from "@siremzam/sentinel";

const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  onDecision: (decision) => {
    const entry = toAuditEntry(decision);
    auditLog.write(entry);
  },
});

// Or at runtime
const unsubscribe = engine.onDecision((d) => auditLog.write(toAuditEntry(d)));
unsubscribe(); // when done
```

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

---

## Integration

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

### Server Mode

Run the engine as a standalone HTTP authorization microservice. This is useful when authorization logic needs to be shared across polyglot services (e.g., a Go API and a Python worker both calling the same policy engine), or when you want to decouple authorization decisions from your application servers entirely.

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

---

## Performance

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

### Benchmarks

Measured on Node v18.18.0, Apple Silicon (ARM64). Run `npm run benchmark` to reproduce.

| Scenario | 100 rules | 1,000 rules | 10,000 rules |
|---|---|---|---|
| `evaluate` (no cache) | 4.3 µs / 231k ops/s | 42.6 µs / 23k ops/s | 1,091 µs / 917 ops/s |
| `evaluate` (cache hit) | 0.6 µs / 1.66M ops/s | 1.8 µs / 553k ops/s | 29.1 µs / 34k ops/s |
| `evaluate` (all conditional) | 3.4 µs / 292k ops/s | 40.2 µs / 25k ops/s | 1,064 µs / 940 ops/s |
| `permitted` (18 actions) | 60.2 µs / 17k ops/s | 718 µs / 1.4k ops/s | 18,924 µs / 53 ops/s |
| `explain` (full trace) | 22.4 µs / 45k ops/s | 564 µs / 1.8k ops/s | 6,444 µs / 155 ops/s |

Most SaaS apps have 10–50 rules. At 100 rules, a single evaluation takes **4.3 µs** — you can run 230,000 authorization checks per second on a single core. With caching enabled, that drops to **0.6 µs**.

---

## Patterns and Recipes

Real-world authorization scenarios and how to model them.

### Ownership — "Users can only edit their own resources"

```typescript
allow()
  .id("edit-own-invoice")
  .roles("member")
  .actions("invoice:update")
  .on("invoice")
  .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
  .describe("Members can edit their own invoices")
  .build();
```

### Time-Gated Access — "Trial expires after 14 days"

```typescript
allow()
  .id("trial-access")
  .roles("trial")
  .actions("report:export")
  .on("report")
  .when(ctx => {
    const createdAt = new Date(ctx.resourceContext.trialStartedAt as string);
    const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 14;
  })
  .describe("Trial users can export for 14 days")
  .build();
```

### Feature Flags — "Beta feature for specific tenants"

```typescript
const BETA_TENANTS = new Set(["acme-corp", "initech"]);

allow()
  .id("beta-analytics")
  .anyRole()
  .actions("analytics:view")
  .on("analytics")
  .when(ctx => BETA_TENANTS.has(ctx.tenantId ?? ""))
  .describe("Analytics dashboard is in beta for select tenants")
  .build();
```

### Async Conditions — "Check external quota service"

```typescript
allow()
  .id("api-rate-limit")
  .roles("member")
  .actions("api:call")
  .on("api")
  .when(async ctx => {
    const usage = await rateLimiter.check(ctx.subject.id);
    return usage.remaining > 0;
  })
  .describe("Members can call API within rate limit")
  .build();
```

### Broad Deny with Targeted Override

```typescript
// Deny all destructive actions at priority 0
deny()
  .id("freeze-destructive")
  .anyRole()
  .actions("project:delete", "project:archive")
  .on("project")
  .describe("Destructive project actions are frozen")
  .build();

// Allow owners to override at priority 10
allow()
  .id("owner-override")
  .roles("owner")
  .actions("project:delete", "project:archive")
  .on("project")
  .priority(10)
  .describe("Owners can still delete/archive their projects")
  .build();
```

### IP-Based Restriction via Async Condition

```typescript
allow()
  .id("admin-from-office")
  .roles("admin")
  .actions("settings:update")
  .on("settings")
  .when(async ctx => {
    const ip = ctx.resourceContext.clientIp as string;
    const geo = await geoService.lookup(ip);
    return geo.isOfficeNetwork;
  })
  .describe("Admin settings changes only from office network")
  .build();
```

---

## Testing Your Policies

Authorization policies are security-critical code — they should be tested like any other business logic. The `explain()` method is purpose-built for this:

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

    // Find the ownership rule and verify the condition failed
    const ownershipRule = result.evaluatedRules.find(
      e => e.rule.id === "member-own-invoices",
    );
    expect(ownershipRule?.conditionResults[0]?.passed).toBe(false);
  });

  it("prevents cross-tenant access", () => {
    // User is admin in acme, viewer in globex
    const resultAcme = engine.evaluate(user, "invoice:approve", "invoice", {}, "acme");
    const resultGlobex = engine.evaluate(user, "invoice:approve", "invoice", {}, "globex");

    expect(resultAcme.allowed).toBe(true);
    expect(resultGlobex.allowed).toBe(false);
  });
});
```

`explain()` returns per-rule evaluation details — which rules matched on role, action, and resource, and which conditions passed or failed. This makes your tests self-documenting: when a test fails, the explain trace tells you exactly *why* the decision changed.

---

## Migration Guide

### Coming from CASL

| CASL | Sentinel |
|---|---|
| `defineAbility(can => { can('read', 'Article') })` | `allow().actions("article:read").on("article").build()` |
| `ability.can('read', 'Article')` | `engine.evaluate(user, "article:read", "article")` |
| `subject('Article', article)` | Actions use `resource:verb` format natively — no wrapper needed |
| `conditions: { authorId: user.id }` | `.when(ctx => ctx.subject.id === ctx.resourceContext.authorId)` |
| No multi-tenancy | Built-in: `{ role: "admin", tenantId: "acme" }` |
| No explain/debug | `engine.explain()` gives per-rule trace |

**Key difference:** CASL uses MongoDB-style conditions (declarative objects). Sentinel uses functions, which gives you full TypeScript expressiveness — async calls, date math, external lookups — with compile-time type safety on the context.

### Coming from Casbin

| Casbin | Sentinel |
|---|---|
| Model file (`model.conf`) | Pure TypeScript schema interface |
| Policy file (`policy.csv`) | Fluent builder API or JSON import |
| `e.Enforce("alice", "data1", "read")` | `engine.evaluate(user, "data:read", "data")` |
| Custom matchers for ABAC | `.when()` conditions with full TypeScript |
| Role manager | `RoleHierarchy` with cycle detection |

**Key difference:** Casbin requires learning its own DSL for model definitions. Sentinel is pure TypeScript — your IDE autocompletes everything, and your policy definitions are type-checked at compile time.

### Coming from accesscontrol

| accesscontrol | Sentinel |
|---|---|
| `ac.grant('admin').createAny('video')` | `allow().roles("admin").actions("video:create").on("video").build()` |
| CRUD only: create, read, update, delete | Domain verbs: `invoice:approve`, `order:ship` |
| `ac.can('admin').createAny('video')` | `engine.evaluate(user, "video:create", "video")` |
| No conditions/ABAC | Full ABAC with `.when()` conditions |
| No multi-tenancy | Built-in per-tenant role assignments |

**Key difference:** accesscontrol is locked into CRUD semantics. If your app has domain-specific actions (approve, archive, impersonate, ship), you'll fight the library. Sentinel treats domain verbs as first-class.

---

## When NOT to Use This

Being honest about boundaries:

- **You need a full policy language.** If you want Rego (OPA), Cedar (AWS), or a declarative DSL, this isn't that. Sentinel policies are TypeScript code, not a separate language.
- **You need a Zanzibar-style relationship graph.** If your authorization model is "who can access this Google Doc?" with deeply nested sharing relationships, use [SpiceDB](https://authzed.com/) or [OpenFGA](https://openfga.dev/).
- **You need a hosted authorization service.** If you want a managed SaaS solution rather than an embedded library, look at [Permit.io](https://permit.io/) or [Oso Cloud](https://www.osohq.com/).
- **Your model is truly just CRUD on REST resources.** If `create`, `read`, `update`, `delete` is all you need and you don't have tenants, simpler libraries like [accesscontrol](https://www.npmjs.com/package/accesscontrol) may be sufficient.

Sentinel is built for TypeScript-first SaaS applications with domain-specific actions, multi-tenant requirements, and a need for observable, testable authorization logic.

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
| `schema` | Your schema type (used for type inference, not read at runtime) |
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
