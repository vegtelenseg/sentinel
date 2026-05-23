# Hono

[← Documentation home](/)

Use `honoGuard()` as route middleware to call sync [`evaluate()`](../reference/access-engine.md#methods) before your handler. Getters receive the Hono context instead of a framework-specific request object.

```typescript
import { honoGuard } from "@siremzam/sentinel/middleware/hono";

app.post(
  "/invoices/:id/approve",
  honoGuard(engine, "invoice:approve", "invoice", {
    getSubject: (c) => c.get("user"),
    getResourceContext: (c) => ({ id: c.req.param("id") }),
    getTenantId: (c) => c.req.header("x-tenant-id"),
  }),
  handler,
);
```

For async conditions, evaluate in the handler with `evaluateAsync()` — see [Async conditions](./async-conditions.md).

---

## Related

- [Middleware reference](../reference/middleware.md)
- [Express guide](./express.md) — same guard pattern
- [Multitenancy](../concepts/multitenancy.md)
