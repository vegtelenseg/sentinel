---
layout: page
---

# Feature comparison

[← Documentation home](../README.md)

<div class="feature-matrix">

| Feature | **Sentinel** | Casbin | accesscontrol | CASL |
| --- | --- | --- | --- | --- |
| TypeScript inference | Full | Partial | Partial | Full |
| Domain actions | Native | Model config | CRUD only | Via `subject` |
| Multi-tenancy | Built-in | Manual | No | Manual |
| ABAC conditions | Sync + async | Matchers | No | `conditions` |
| Role hierarchy | Built-in | Via model | Built-in | No |
| Audit trail | `onDecision` | Watcher | No | No |
| Debug / explain | `explain()` trace | No | No | No |
| UI permissions | `permitted()` | No | `filter()` | `can()` |
| JSON policies | `exportRules` | Adapters | No | `@casl/ability/extra` |
| HTTP server mode | Built-in | No | No | No |
| Middleware | Express, Fastify, Hono, NestJS | Community | Community | Express, NestJS |
| Dependencies | **0** | 2+ | 2 | 1+ |
| Policy DSL | **No** (TypeScript) | Yes | No | No |

</div>
