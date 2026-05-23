# UI permissions

[← Documentation home](/)

Use [`evaluate()`](../reference/access-engine.md#methods) for one action at a time. Use `permitted()` when a UI needs to know **which** of several actions on one resource are allowed — it returns a `Set` of action strings (e.g. which buttons to show).

Pass the same `resourceContext` you use in API checks so ABAC conditions align.

---

## Example

```typescript
const actions = engine.permitted(
  user,
  "invoice",
  ["invoice:create", "invoice:read", "invoice:approve", "invoice:send"],
  { ownerId: user.id },
  "tenant-a",
);

if (actions.has("invoice:approve")) {
  showApproveButton();
}
```

---

## Async

Use `permittedAsync()` when any matching rule has async conditions — same rule as [`evaluateAsync()`](./async-conditions.md#use-async-evaluation-apis):

```typescript
const actions = await engine.permittedAsync(
  user,
  "invoice",
  ["invoice:create", "invoice:read", "invoice:approve", "invoice:send"],
  { ownerId: user.id },
  "tenant-a",
);
```

The returned `Set` shape is identical to sync `permitted()`.

---

## Performance

`permitted()` runs one evaluation per action in the list. For a handful of UI toggles this is fine; for large action lists at high QPS, cache the resulting set briefly in your app layer (keyed by subject, tenant, and resource).

→ [Performance and benchmarks](./performance.md) · [Evaluation cache](./evaluation-cache.md)

---

## Related

- [AccessEngine reference](../reference/access-engine.md#methods)
- [Actions and resources](../concepts/actions-and-resources.md)
- [Conditions (ABAC)](../concepts/conditions.md)
- [Async conditions](./async-conditions.md)
