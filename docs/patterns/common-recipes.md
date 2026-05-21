# Common recipes

[← Documentation home](/)

Copy-adapt patterns for frequent authorization scenarios.

---

## Time-gated access

```typescript
allow()
  .roles("trial")
  .actions("report:export")
  .on("report")
  .when(ctx => {
    const started = new Date(ctx.resourceContext.trialStartedAt as string);
    const days = (Date.now() - started.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 14;
  })
  .build();
```

---

## Feature flags per tenant

```typescript
const BETA_TENANTS = new Set(["acme-corp", "initech"]);

allow()
  .anyRole()
  .actions("analytics:view")
  .on("analytics")
  .when(ctx => BETA_TENANTS.has(ctx.tenantId ?? ""))
  .build();
```

---

## Broad deny with targeted override

```typescript
deny()
  .anyRole()
  .actions("project:delete", "project:archive")
  .on("project")
  .build(),

allow()
  .roles("owner")
  .actions("project:delete", "project:archive")
  .on("project")
  .priority(10)
  .build();
```

---

## IP / network restriction (async)

```typescript
allow()
  .roles("admin")
  .actions("settings:update")
  .on("settings")
  .when(async ctx => {
    const ip = ctx.resourceContext.clientIp as string;
    const geo = await geoService.lookup(ip);
    return geo.isOfficeNetwork;
  })
  .build();
```

Use `evaluateAsync()` for routes with this rule.

---

## Related

- [Priority and deny resolution](../concepts/priority-and-deny.md)
- [Async conditions](../guides/async-conditions.md)
