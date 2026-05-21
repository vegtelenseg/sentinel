# Migrating from accesscontrol

[← Documentation home](/)

| accesscontrol | Sentinel |
|---|---|
| `ac.grant('admin').createAny('video')` | `allow().roles("admin").actions("video:create").on("video").build()` |
| CRUD only | Domain verbs: `invoice:approve`, `order:ship` |
| No conditions/ABAC | `.when()` conditions |
| No multi-tenancy | Per-tenant role assignments |

**Key difference:** accesscontrol is locked to CRUD semantics. Sentinel treats domain verbs as first-class.
