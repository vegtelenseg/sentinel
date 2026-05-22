---
layout: home

hero:
  name: Sentinel
  text: Authorization for TypeScript SaaS
  tagline: Type-safe policies, multi-tenant roles, and explainable decisions — zero dependencies.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/quickstart
    - theme: alt
      text: What is Sentinel?
      link: /introduction/what-is-sentinel
    - theme: alt
      text: Compare libraries
      link: /comparisons/feature-matrix
    - theme: alt
      text: Try the playground
      link: https://vegtelenseg.github.io/sentinel-example/

features:
  - title: Type-safe schema
    details: Roles, resources, and actions are defined once. Typos in invoice:aprove fail at compile time, not in production.
  - title: Multi-tenancy built in
    details: Per-tenant role assignments and strict tenancy mode — tenant context travels with every evaluation.
  - title: explain() traces
    details: When access breaks, replay every rule — role, action, resource, and condition results — in one call.
  - title: Domain actions
    details: invoice:approve and project:archive are first-class — not forced into CRUD-shaped permissions.
  - title: Framework middleware
    details: Ready-made guards for Express, Fastify, Hono, and NestJS — plug in your engine, no custom middleware to write.
  - title: Zero dependencies
    details: ~1,800 lines, 1:1 test ratio. Optional subpath imports for middleware and server mode only.
---

## Framework middleware

Sentinel ships **middleware for your stack** — not a DIY auth layer you have to build yourself. Import the guard for your framework, pass the engine and options, and protect routes in a few lines.

| Framework | Guide |
| --- | --- |
| Express | [Express middleware](./guides/express.md) |
| Fastify | [Fastify middleware](./guides/fastify.md) |
| Hono | [Hono middleware](./guides/hono.md) |
| NestJS | [NestJS guards](./guides/nestjs.md) |
| Polyglot / HTTP | [Server mode](./guides/server-mode.md) |

→ [Middleware reference](./reference/middleware.md) for all option types and exports.

---

## Documentation map

| I want to… | Start here |
| --- | --- |
| Understand what Sentinel is | [What is Sentinel?](./introduction/what-is-sentinel.md) |
| Install and evaluate in five minutes | [Quickstart](./getting-started/quickstart.md) |
| Protect routes with Express, Fastify, Hono, or NestJS | [Framework middleware](#framework-middleware) |
| Learn how decisions are made | [How evaluation works](./concepts/how-evaluation-works.md) |
| Compare with CASL, Casbin, or accesscontrol | [Feature comparison](./comparisons/feature-matrix.md) |

Full index: [documentation hub](./README.md).
