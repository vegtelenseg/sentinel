# Wildcard actions

[← Documentation home](/)

Wildcard patterns let one rule cover a family of actions without listing every verb.

---

## Syntax

| Pattern | Matches |
|---|---|
| `invoice:*` | `invoice:create`, `invoice:read`, `invoice:approve`, … |
| `*:read` | `invoice:read`, `project:read`, … |

The `*` segment matches any characters except `:` within that segment (implemented as `[^:]*` in regex).

---

## Example

```typescript
allow()
  .roles("manager")
  .actions("invoice:*" as AppSchema["actions"])
  .on("invoice")
  .describe("Managers can do anything with invoices")
  .build();
```

TypeScript may require `as AppSchema["actions"]` because wildcard strings are wider than your action union — the engine validates at runtime.

---

## Performance

Wildcards compile to `RegExp` when the rule is added (`addRule`), not on each evaluation.

---

## Related

- [Actions and resources](../concepts/actions-and-resources.md)
