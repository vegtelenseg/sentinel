# Middleware

[← Documentation home](/)

HTTP route guards that call sync [`evaluate()`](./access-engine.md#methods) before your handler runs. You provide getters that map the request to a [`Subject`](../concepts/subjects-and-roles.md), optional `resourceContext`, and optional `tenantId` — the same arguments you would pass to `evaluate()` manually.

**Use middleware** at the HTTP boundary so handlers assume authorization already passed. **Call `evaluate()` directly** in background jobs, GraphQL resolvers, or anywhere async conditions require `evaluateAsync()` — see [Async conditions](../guides/async-conditions.md).

---

## Exports

| Package | Export | Options |
|---|---|---|
| `middleware/express` | `guard` | `getSubject`, `getResourceContext?`, `getTenantId?`, `onDenied?` |
| `middleware/fastify` | `fastifyGuard` | Same |
| `middleware/hono` | `honoGuard` | Same (Hono context) |
| `middleware/nestjs` | `createAuthorizeDecorator`, `createAuthGuard` | Engine + getters |

All guards use sync `evaluate()` unless you wrap async evaluation yourself.

---

## Example (Express)

```typescript
import { guard } from "@siremzam/sentinel/middleware/express";

app.post(
  "/invoices/:id/approve",
  guard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ id: req.params.id, ownerId: req.invoice.ownerId }),
    getTenantId: (req) => req.headers["x-tenant-id"] as string,
  }),
  handler,
);
```

**401** when `getSubject` returns `undefined`. **403** with `{ error, reason }` on deny unless `onDenied` is customized.

Pass the same `resourceContext` shape you use in [`evaluate()`](./access-engine.md#methods) and in [UI permission checks](../guides/ui-permissions.md) so ABAC conditions stay consistent.

---

## Framework guides

- [Express](../guides/express.md)
- [Fastify](../guides/fastify.md)
- [Hono](../guides/hono.md)
- [NestJS](../guides/nestjs.md)

---

## Related

- [AccessEngine](./access-engine.md)
- [Multitenancy](../concepts/multitenancy.md) — `getTenantId`
- [Async conditions](../guides/async-conditions.md) — when sync guards are not enough
- [Quickstart: protect a route](../getting-started/quickstart.md#step-7-protect-an-http-route-optional)
