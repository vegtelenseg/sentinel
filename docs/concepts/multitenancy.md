# Multitenancy

[← Documentation home](/)

Multi-tenant SaaS applications need authorization that respects **organizational boundaries**. Sentinel models tenants in role assignments and evaluation — not as an afterthought in middleware.

---

## Tenant-scoped role assignments

```typescript
const user: Subject<AppSchema> = {
  id: "user-1",
  roles: [
    { role: "admin", tenantId: "acme-corp" },
    { role: "viewer", tenantId: "globex" },
    { role: "member" }, // global
  ],
};
```

### Evaluation with `tenantId`

```typescript
engine.evaluate(user, "invoice:approve", "invoice", {}, "acme-corp");
// Effective roles: admin, member (global)

engine.evaluate(user, "invoice:approve", "invoice", {}, "globex");
// Effective roles: viewer, member (global)
```

**Global roles** (no `tenantId` on the assignment) apply in **every** tenant context. Use intentionally.

---

## Where `tenantId` comes from

Typical sources:

- Subdomain (`acme.app.com`)
- Path prefix (`/orgs/acme/...`)
- Header (`X-Tenant-Id`) — common in internal APIs
- JWT claim resolved in auth middleware

Pass the same tenant identifier to `evaluate()` that you used when loading the user's memberships.

---

## Strict tenancy

```typescript
const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  strictTenancy: true,
});
```

When enabled, if the subject has **any** tenant-scoped role assignment and you call `evaluate()` **without** `tenantId`, the engine **throws**.

**Why:** Forgetting tenant context should fail loudly in development, not evaluate with an ambiguous role set that might over- or under-permit.

Subjects with **only** global roles can still be evaluated without `tenantId`.

---

## Resource context vs tenant

`resourceContext.tenantId` is optional metadata for conditions — it does **not** replace the evaluation `tenantId` parameter for role filtering.

Use the evaluation parameter for **which hat the user wears**. Use resource context when the rule depends on **which organization owns the resource**.

```typescript
.when(ctx => ctx.resourceContext.tenantId === ctx.tenantId)
```

---

## Testing cross-tenant isolation

```typescript
it("prevents cross-tenant admin powers", () => {
  expect(engine.evaluate(user, "invoice:approve", "invoice", {}, "acme").allowed).toBe(true);
  expect(engine.evaluate(user, "invoice:approve", "invoice", {}, "globex").allowed).toBe(false);
});
```

→ [Testing policies](../guides/testing.md)

---

## Related pages

- [Subjects and roles](./subjects-and-roles.md)
- [Express guide](../guides/express.md) — `getTenantId`
