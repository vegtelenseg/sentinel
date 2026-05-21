# Feature comparison

[← Documentation home](/)

| Feature | **Sentinel** | Casbin | accesscontrol | CASL |
|---|---|---|---|---|
| TypeScript-first (full inference) | Yes | Partial | Partial | Yes |
| Domain actions (`invoice:approve`) | Native | Via model config | No (CRUD only) | Via `subject` |
| Multi-tenancy (per-tenant roles) | Built-in | Manual | No | Manual |
| ABAC conditions | Sync + async | Via matchers | No | Via `conditions` |
| Role hierarchy | Built-in, cycle-detected | Via model | Built-in | No |
| Audit trail | `onDecision` + `toAuditEntry()` | Via watcher | No | No |
| Debug/explain | `explain()` with per-rule trace | No | No | No |
| UI permission set | `permitted()` → `Set` | No | `permission.filter()` | `ability.can()` per action |
| JSON policy storage | `exportRules` / `importRules` | CSV / JSON adapters | No | Via `@casl/ability/extra` |
| Server mode (HTTP microservice) | Built-in | No | No | No |
| Middleware | Express, Fastify, Hono, NestJS | Community | Community | Express, NestJS |
| Dependencies | **0** | 2+ | 2 | 1+ |
| DSL required | **No** (TypeScript) | Yes | No | No |
