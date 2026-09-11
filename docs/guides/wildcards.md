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
  .actions("invoice:*")
  .on("invoice")
  .describe("Managers can do anything with invoices")
  .build();
```

`RuleBuilder.actions()` accepts schema actions and `ActionPattern` wildcards (`invoice:*`, `*:read`). Casts like `"invoice:*" as AppSchema["actions"]` still typecheck. `evaluate()` still takes a concrete schema action, not a wildcard.

---

## Performance

Wildcards compile to `RegExp` when the rule is added (`addRule`), not on each evaluation.

---

## Related

- [Actions and resources](../concepts/actions-and-resources.md)
