---
layout: home

hero:
  name: Sentinel
  text: Authorization for TypeScript SaaS
  tagline: Type-safe policies, multi-tenant roles, and explainable decisions — zero dependencies.
  actions:
    - theme: brand
      text: Quickstart
      link: /getting-started/quickstart
    - theme: alt
      text: Try the playground
      link: https://vegtelenseg.github.io/sentinel-example/
---

## Framework middleware

Sentinel ships **middleware for your stack** — not a DIY **AuthZ** layer you have to build yourself. Import the guard for your framework, pass the engine and options, and protect routes in a few lines.

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
