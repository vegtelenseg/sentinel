# Role hierarchy

[← Documentation home](/)

Role hierarchy lets senior roles **inherit** permissions defined for junior roles without duplicating rules. If `admin` inherits `manager`, any rule that applies to `manager` also applies to users with the `admin` role.

---

## Defining hierarchy

```typescript
import { RoleHierarchy } from "@siremzam/sentinel";

const hierarchy = new RoleHierarchy<AppSchema>()
  .define("owner", ["admin"])
  .define("admin", ["manager"])
  .define("manager", ["member"])
  .define("member", ["viewer"]);

const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  roleHierarchy: hierarchy,
});
```

`define(role, inheritsFrom)` means: `role` includes all permissions of each role in `inheritsFrom`, transitively.

---

## Resolution at evaluation time

When a subject has role `admin` in a tenant:

1. Start with `{ admin }`
2. Expand to `{ admin, manager, member, viewer }`
3. Match rules against the expanded set

You can write rules only for `viewer` and `member`; `admin` still matches via inheritance.

---

## Cycle detection

Circular definitions throw **at definition time**:

```typescript
// Throws — cycle detected
hierarchy
  .define("a", ["b"])
  .define("b", ["a"]);
```

---

## API summary

| Method | Purpose |
|---|---|
| `define(role, inheritsFrom[])` | Add inheritance edges |
| `resolve(role)` | Set of roles including inherited |
| `resolveAll(roles[])` | Merge expansion for multiple assigned roles |
| `definedRoles()` | Roles that appear in hierarchy definitions |

---

## When to use hierarchy vs explicit rules

**Use hierarchy** when permissions are strictly cumulative by seniority (viewer ⊂ member ⊂ manager).

**Use explicit rules per role** when senior roles have *different* powers, not just more of the same — hierarchy is not a substitute for thoughtful policy design.

---

## Related pages

- [Subjects and roles](./subjects-and-roles.md)
- [RoleHierarchy reference](../reference/access-engine.md)
