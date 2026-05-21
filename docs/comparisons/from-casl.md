# Migrating from CASL

[← Documentation home](/)

| CASL | Sentinel |
|---|---|
| `defineAbility(can => { can('read', 'Article') })` | `allow().actions("article:read").on("article").build()` |
| `ability.can('read', 'Article')` | `engine.evaluate(user, "article:read", "article")` |
| `subject('Article', article)` | `resource:verb` actions + `resourceContext` |
| `conditions: { authorId: user.id }` | `.when(ctx => ctx.subject.id === ctx.resourceContext.authorId)` |
| No multi-tenancy | `{ role: "admin", tenantId: "acme" }` |
| No explain/debug | `engine.explain()` |

**Key difference:** CASL uses declarative condition objects (Mongo-like). Sentinel uses TypeScript functions — better for async, dates, and external calls, with compile-time action types.
