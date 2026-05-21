# Migrating from Casbin

[← Documentation home](/)

| Casbin | Sentinel |
|---|---|
| `model.conf` | `SchemaDefinition` interface |
| `policy.csv` | Fluent builder or JSON import |
| `e.Enforce("alice", "data1", "read")` | `engine.evaluate(user, "data:read", "data")` |
| Custom matchers for ABAC | `.when()` conditions |
| Role manager | `RoleHierarchy` with cycle detection |

**Key difference:** Casbin requires its own DSL and adapter files. Sentinel is pure TypeScript with IDE autocomplete.
