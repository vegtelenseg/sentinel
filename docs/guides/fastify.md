# Fastify

[← Documentation home](/)

Use `fastifyGuard()` as a `preHandler` to call sync [`evaluate()`](../reference/access-engine.md#methods) before your route handler. Same getter options as Express — see [Middleware reference](../reference/middleware.md).

```typescript
import { fastifyGuard } from "@siremzam/sentinel/middleware/fastify";

fastify.post("/invoices/:id/approve", {
  preHandler: fastifyGuard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ id: req.params.id }),
    getTenantId: (req) => req.headers["x-tenant-id"] as string,
  }),
}, handler);
```

For async conditions, evaluate in the handler with `evaluateAsync()` — see [Async conditions](./async-conditions.md).

---

## Related

- [Middleware reference](../reference/middleware.md)
- [Express guide](./express.md) — same guard pattern
- [Multitenancy](../concepts/multitenancy.md)
