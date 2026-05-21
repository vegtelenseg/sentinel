# Fastify

[← Documentation home](/)

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
