# Async conditions

[← Documentation home](/)

Some authorization checks need **I/O**: database lookups, quota services, geo IP APIs. Sentinel supports async condition functions with dedicated evaluation methods.

---

## Define an async condition

```typescript
engine.addRule(
  allow()
    .roles("member")
    .actions("report:export")
    .on("report")
    .when(async (ctx) => {
      const quota = await db.getExportQuota(ctx.subject.id);
      return quota.remaining > 0;
    })
    .build(),
);
```

---

## Use async evaluation APIs

| Sync (throws if async condition) | Async |
|---|---|
| `evaluate()` | `evaluateAsync()` |
| `explain()` | `explainAsync()` |
| `permitted()` | `permittedAsync()` |

```typescript
const decision = await engine.evaluateAsync(
  user,
  "report:export",
  "report",
  {},
  tenantId,
);
```

---

## Middleware note

Express `guard()` uses sync `evaluate()` today. For async conditions, evaluate in your handler or wrap middleware that awaits `evaluateAsync()`.

---

## Related

- [Conditions (ABAC)](../concepts/conditions.md)
