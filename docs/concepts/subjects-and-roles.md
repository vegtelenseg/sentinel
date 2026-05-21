# Subjects and roles

[← Documentation home](/)

A **subject** is the entity requesting access — almost always an authenticated user, but the type does not require a human. A service account or API key wrapper can be a subject as long as it has an `id` and `roles`.

---

## Subject shape

```typescript
import type { Subject } from "@siremzam/sentinel";

const user: Subject<AppSchema> = {
  id: "user-42",
  roles: [
    { role: "admin", tenantId: "acme" },
    { role: "viewer", tenantId: "globex" },
  ],
  attributes: {
    department: "finance",
  },
};
```

| Field | Purpose |
|---|---|
| `id` | Stable identifier — used in conditions and audit entries |
| `roles` | List of role assignments (see below) |
| `attributes` | Optional bag of extra data for ABAC conditions |

---

## Role assignments

Each assignment links a **role** from your schema to an optional **tenant**:

```typescript
{ role: "admin", tenantId: "acme" }
{ role: "member" } // global — applies in every tenant context
```

### Global roles

A role **without** `tenantId` is **global**. When evaluating with any `tenantId`, global roles are included in the resolved role set.

Use global roles sparingly — they are powerful and easy to misuse. Platform super-admin is a typical case.

### Tenant-scoped roles

When you pass `tenantId` to `evaluate()`, only assignments matching that tenant **plus** global roles are considered.

**Why:** A user who is admin at Company A must not receive admin powers when the request context is Company B.

→ [Multitenancy](./multitenancy.md)

---

## Role resolution and hierarchy

Before rules are matched, the engine:

1. Filters assignments by `tenantId` (if provided)
2. Collects role names
3. Expands via **role hierarchy** if configured (`admin` → also `manager`, `member`, …)

```typescript
import { RoleHierarchy } from "@siremzam/sentinel";

const hierarchy = new RoleHierarchy<AppSchema>()
  .define("admin", ["manager"])
  .define("manager", ["member"]);

const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  roleHierarchy: hierarchy,
});
```

→ [Role hierarchy](./role-hierarchy.md)

---

## Mapping from your auth layer

Sentinel does not load users from a database. Your authentication middleware or session loader should produce a `Subject`:

```typescript
function toSubject(dbUser: DbUser): Subject<AppSchema> {
  return {
    id: dbUser.id,
    roles: dbUser.memberships.map(m => ({
      role: m.role as AppSchema["roles"],
      tenantId: m.orgId,
    })),
  };
}
```

Keep this mapping in one module — every route and job should use the same shape.

---

## Related pages

- [Multitenancy](./multitenancy.md)
- [Role hierarchy](./role-hierarchy.md)
- [Conditions (ABAC)](./conditions.md)
