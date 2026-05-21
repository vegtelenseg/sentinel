# Express

[← Documentation home](/)

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

→ [Middleware reference](../reference/middleware.md)
