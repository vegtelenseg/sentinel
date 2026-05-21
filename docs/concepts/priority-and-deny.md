# Priority and deny resolution

[← Documentation home](/)

When multiple rules could apply to one request, Sentinel needs deterministic tie-breaking. Two mechanisms control that: **numeric priority** and **deny-before-allow at equal priority**.

---

## Sort order

Before first-match evaluation, candidates are sorted:

1. **Descending `priority`** (higher number = checked first)
2. At the same priority, **`deny` rules before `allow` rules**

Default priority is `0` if omitted.

---

## Deny wins at equal priority

```typescript
deny()
  .anyRole()
  .actions("project:delete")
  .on("project")
  .build(),

allow()
  .roles("owner")
  .actions("project:delete")
  .on("project")
  .build(), // priority 0 — same as deny
```

For an `owner`, **both** rules are candidates. At priority `0`, **deny sorts first** and matches — owner cannot delete unless you raise the allow rule's priority.

---

## Override pattern

Give the exception **higher priority** than the broad deny:

```typescript
deny()
  .anyRole()
  .actions("project:delete", "project:archive")
  .on("project")
  .priority(0)
  .build(),

allow()
  .roles("owner")
  .actions("project:delete", "project:archive")
  .on("project")
  .priority(10)
  .build(),
```

Now the owner's allow rule is sorted first and wins.

---

## First match wins

After sorting, the engine walks the list and **stops at the first fully matching rule** (including conditions). Later rules are never considered.

Design policies as a ordered decision list, not as independent booleans combined at the end.

---

## Related pages

- [How evaluation works](./how-evaluation-works.md)
- [Common recipes](../patterns/common-recipes.md)
