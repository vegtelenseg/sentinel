# Ownership and resource-scoped access

[← Documentation home](/)

The most common ABAC pattern: users may access a resource only when they **own** it (or belong to the owning team).

```typescript
allow()
  .roles("member")
  .actions("invoice:update", "invoice:read")
  .on("invoice")
  .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
  .describe("Members can access their own invoices")
  .build();
```

Pass `ownerId` in `resourceContext` from your loader — the same object you use in API `evaluate()` and middleware `getResourceContext`.

---

## Related

- [Conditions](../concepts/conditions.md)
