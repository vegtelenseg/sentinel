# Hono

[← Documentation home](/)

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
