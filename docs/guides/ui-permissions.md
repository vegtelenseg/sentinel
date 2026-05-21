# UI permissions

[← Documentation home](/)

Backend checks are not enough — buttons and menu items should reflect what the user **can** do. `permitted()` evaluates multiple actions for one resource and returns a **`Set`** of allowed action strings.

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

Pass the same `resourceContext` you would use in API checks so ABAC conditions align.

---

## Async

```typescript
const actions = await engine.permittedAsync(user, "invoice", actionList, ctx, tenantId);
```

---

## Performance

`permitted()` runs one evaluation per action. For large action lists at high QPS, consider caching the set per subject/tenant/resource briefly in your app layer.

→ [Performance](./performance.md)
