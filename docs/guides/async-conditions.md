# Async conditions

[← Documentation home](/)

Some authorization checks need **I/O** — database lookups, quota services, geo IP APIs. Write async `.when()` predicates, then use the **async evaluation methods** (`evaluateAsync`, `explainAsync`, `permittedAsync`) instead of their sync counterparts.

Sync methods throw with a clear error if a matching rule has an async condition.

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

```typescript
app.post("/reports/export", async (req, res) => {
  const decision = await engine.evaluateAsync(
    req.user,
    "report:export",
    "report",
    {},
    req.headers["x-tenant-id"] as string,
  );
  if (!decision.allowed) return res.status(403).json({ error: decision.reason });
  // ...
});
```

See the [framework guides](./express.md) for sync guard setup.

---

## Related

- [Conditions (ABAC)](../concepts/conditions.md)
- [Middleware reference](../reference/middleware.md)
- [Express](./express.md) · [Fastify](./fastify.md) · [Hono](./hono.md) · [NestJS](./nestjs.md)
