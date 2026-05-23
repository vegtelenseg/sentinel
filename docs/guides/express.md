# Express

[← Documentation home](/)

Use `guard()` as route middleware to call sync [`evaluate()`](../reference/access-engine.md#methods) before your handler. Map the request to a [`Subject`](../concepts/subjects-and-roles.md), optional `resourceContext`, and optional `tenantId` — the same inputs as a manual evaluation.

```typescript
import { guard } from "@siremzam/sentinel/middleware/express";

app.post(
  "/invoices/:id/approve",
  guard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ id: req.params.id }),
    getTenantId: (req) => req.headers["x-tenant-id"] as string,
  }),
  handler,
);
```

**401** when `getSubject` returns undefined. **403** with `{ error, reason }` on deny unless `onDenied` is customized.

For async conditions, evaluate in the handler with `evaluateAsync()` instead — see [Async conditions](./async-conditions.md).

---

## Related

- [Middleware reference](../reference/middleware.md)
- [Multitenancy](../concepts/multitenancy.md)
- [Quickstart: protect a route](../getting-started/quickstart.md#step-7-protect-an-http-route-optional)
