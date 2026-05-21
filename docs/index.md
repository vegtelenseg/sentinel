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
      text: Try the playground
      link: https://vegtelenseg.github.io/sentinel-example/

features:
  - title: Type-safe schema
    details: Roles, resources, and actions are defined once. Typos in invoice:aprove fail at compile time, not in production.
  - title: Multi-tenancy built in
    details: Per-tenant role assignments and strict tenancy mode — no middleware hacks for org boundaries.
  - title: explain() traces
    details: When access breaks, replay every rule — role, action, resource, and condition results — in one call.
  - title: Domain actions
    details: invoice:approve and project:archive are first-class — not forced into CRUD-shaped permissions.
  - title: Pure TypeScript policies
    details: No DSL files. Async conditions, hierarchy, JSON export — all in code you already review in PRs.
  - title: Zero dependencies
    details: ~1,800 lines, 1:1 test ratio. Express, Fastify, Hono, and NestJS middleware on optional subpaths.
---

## Documentation map

| I want to… | Start here |
| --- | --- |
| Understand what Sentinel is | [What is Sentinel?](./introduction/what-is-sentinel) |
| Install and evaluate in five minutes | [Quickstart](./getting-started/quickstart) |
| Learn how decisions are made | [How evaluation works](./concepts/how-evaluation-works) |
| Compare with other libraries | [Feature matrix](./comparisons/feature-matrix) |

Browse the full table of contents in the [documentation hub](./README).
