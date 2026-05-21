# Documentation hub

Welcome to the documentation for **[@siremzam/sentinel](https://www.npmjs.com/package/@siremzam/sentinel)** — a TypeScript-first authorization engine for SaaS applications.

> **Web site:** [vegtelenseg.github.io/sentinel](https://vegtelenseg.github.io/sentinel/) (search, sidebar, dark mode). This page is the same content for browsing in the repo.

This documentation is organized the way you would expect from a mature library: progressive learning paths, deep concept pages, practical guides, and a complete API reference. Every page explains **what** something is, **why** it exists, and **how** to use it — with enough context that you should not need to read the source to understand behavior.

---

## Start here

| I want to… | Go to |
|---|---|
| Understand what Sentinel is and whether it fits my app | [What is Sentinel?](./introduction/what-is-sentinel.md) |
| Install and run my first evaluation in five minutes | [Quickstart](./getting-started/quickstart.md) |
| See why teams pick Sentinel over scattered `if (role)` checks | [Why Sentinel?](./introduction/why-sentinel.md) |
| Try policies in the browser without installing anything | [Interactive playground](https://vegtelenseg.github.io/sentinel-example/) |

---

## Getting started

A linear path from zero to a working policy engine.

1. [Installation](./getting-started/installation.md) — add the package, understand exports and bundle size
2. [Quickstart](./getting-started/quickstart.md) — schema, policies, evaluation, and tenant context in one walkthrough

After the quickstart, read [How evaluation works](./concepts/how-evaluation-works.md) so every later feature clicks into place.

---

## Core concepts

Read these in order if you are new to authorization engines, or jump to what you need.

| Concept | What you will learn |
|---|---|
| [The schema](./concepts/schema.md) | How one TypeScript interface drives autocomplete and compile-time safety across the entire API |
| [Subjects and roles](./concepts/subjects-and-roles.md) | Who is asking for access, how roles are assigned, and global vs tenant-scoped roles |
| [Actions and resources](./concepts/actions-and-resources.md) | Domain verbs (`invoice:approve`) instead of CRUD, and why that matters |
| [Policy rules](./concepts/policy-rules.md) | The atomic unit of authorization — allow, deny, conditions, priority |
| [How evaluation works](./concepts/how-evaluation-works.md) | The full decision pipeline: role resolution, matching, sorting, first-match-wins |
| [Multitenancy](./concepts/multitenancy.md) | Per-tenant roles, strict mode, and preventing cross-tenant leaks |
| [Conditions (ABAC)](./concepts/conditions.md) | Attribute-based rules, sync vs async, fail-closed semantics |
| [Role hierarchy](./concepts/role-hierarchy.md) | Inheritance, expansion at evaluation time, cycle detection |
| [Priority and deny resolution](./concepts/priority-and-deny.md) | Why deny wins at equal priority and how to override broad denies |

---

## Guides

Task-oriented documentation for real application work.

### Writing and managing policies

- [The policy factory](./guides/policy-factory.md) — `createPolicyFactory` and fluent `allow()` / `deny()` builders
- [Wildcard actions](./guides/wildcards.md) — `invoice:*`, `*:read`, and compile-time patterns
- [Async conditions](./guides/async-conditions.md) — database lookups, quotas, and the async evaluation APIs
- [JSON policy serialization](./guides/json-serialization.md) — store rules in a database with `ConditionRegistry`
- [Testing policies](./guides/testing.md) — table-driven tests with `explain()` traces

### Observability and UX

- [Debugging with `explain()`](./guides/explain-and-debugging.md) — per-rule traces when access breaks in production
- [Audit logging](./guides/audit-logging.md) — `onDecision`, `toAuditEntry()`, and structured events
- [UI permissions](./guides/ui-permissions.md) — `permitted()` for buttons, menus, and route guards
- [Evaluation cache](./guides/evaluation-cache.md) — when caching is safe and when it is not

### Framework integration

- [Express](./guides/express.md)
- [Fastify](./guides/fastify.md)
- [Hono](./guides/hono.md)
- [NestJS](./guides/nestjs.md)
- [Server mode](./guides/server-mode.md) — HTTP microservice for polyglot stacks

### Patterns

- [Ownership and resource-scoped access](./patterns/ownership.md)
- [Common recipes](./patterns/common-recipes.md) — time gates, feature flags, deny-with-override, IP restrictions

---

## Comparisons and migration

| From | Guide |
|---|---|
| CASL | [Migrating from CASL](./comparisons/from-casl.md) |
| Casbin | [Migrating from Casbin](./comparisons/from-casbin.md) |
| accesscontrol | [Migrating from accesscontrol](./comparisons/from-accesscontrol.md) |
| All libraries | [Feature comparison](./comparisons/feature-matrix.md) |

---

## Reference

Complete API surface — use when you know what you need and want signatures and behavior tables.

- [`AccessEngine`](./reference/access-engine.md)
- [`RuleBuilder` / `createPolicyFactory`](./reference/rule-builder.md)
- [Types](./reference/types.md) — `Subject`, `Decision`, `EvaluationContext`, and more
- [Middleware](./reference/middleware.md)
- [Server](./reference/server.md)
- [Serialization](./reference/serialization.md)

---

## Other resources

- [When not to use Sentinel](./introduction/when-not-to-use.md)
- [Security model](./introduction/security.md)
- [Performance and benchmarks](./guides/performance.md)
- [Examples](https://github.com/vegtelenseg/sentinel/tree/main/examples) — runnable `standalone` and `express-multi-tenant` projects
- [CHANGELOG](https://github.com/vegtelenseg/sentinel/blob/main/CHANGELOG.md)
- [CONTRIBUTING](https://github.com/vegtelenseg/sentinel/blob/main/CONTRIBUTING.md)

---

## How to read this documentation

**Concept pages** build mental models. Read them when you are designing your authorization layer or onboarding a teammate.

**Guides** assume you understand the concepts and show complete, copy-paste-friendly examples with prose around every snippet.

**Reference pages** document every option and method without narrative — the single source of truth for behavior.

If something is missing or unclear, [open an issue](https://github.com/vegtelenseg/sentinel/issues) — gaps in docs are treated as bugs.
