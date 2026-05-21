# The schema

[← Documentation home](/)

The schema is the **root type definition** for your authorization domain. Every role name, resource name, and action string flows from a single interface extending `SchemaDefinition`.

---

## Defining a schema

```typescript
import type { SchemaDefinition } from "@siremzam/sentinel";

interface AppSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "member" | "viewer";
  resources: "invoice" | "project" | "settings";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:approve"
    | "project:read"
    | "settings:update";
}
```

### Fields

| Field | Required | Purpose |
|---|---|---|
| `roles` | Yes | Union of role identifiers assigned to subjects |
| `resources` | Yes | Union of resource types being protected |
| `actions` | Yes | Union of actions — conventionally `` `${resource}:${verb}` `` |
| `tenantId` | No | Union of tenant identifiers if you want branded tenant strings |

`actions` should extend `ActionString` (`` `${string}:${string}` ``). TypeScript enforces the colon-separated shape.

---

## How the schema propagates types

When you write `AccessEngine<AppSchema>`, these inferred types become available everywhere:

- `InferRole<AppSchema>` → `"owner" | "admin" | …`
- `InferResource<AppSchema>` → `"invoice" | "project" | …`
- `InferAction<AppSchema>` → your action union
- `InferTenantId<AppSchema>` → your tenant union or `string`

Policy builders, `evaluate()`, middleware, and `Subject` all use the same `AppSchema` generic parameter.

---

## The runtime `schema` option

```typescript
const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
});
```

**Important:** The `schema` property is **not validated at runtime**. It is an empty object cast so TypeScript can infer `S` in the constructor. Your real source of truth is the `AppSchema` interface in your codebase.

Do not expect runtime errors if someone passes a wrong action at runtime from untyped JavaScript — TypeScript is the primary guard; add runtime validation at API boundaries if you accept untyped input.

---

## Evolving the schema

Adding a new action or role is a **compile-time migration**:

1. Extend the interface union.
2. Fix compile errors in policies and call sites.
3. Deploy.

Removing an action forces you to delete or update every rule and `evaluate()` that referenced it — the compiler lists all locations.

---

## Related pages

- [Actions and resources](./actions-and-resources.md)
- [Subjects and roles](./subjects-and-roles.md)
- [Quickstart](../getting-started/quickstart.md)
