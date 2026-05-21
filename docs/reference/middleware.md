# Middleware

[← Documentation home](/)

| Package | Export | Options |
|---|---|---|
| `middleware/express` | `guard` | `getSubject`, `getResourceContext?`, `getTenantId?`, `onDenied?` |
| `middleware/fastify` | `fastifyGuard` | Same |
| `middleware/hono` | `honoGuard` | Same (Hono context) |
| `middleware/nestjs` | `createAuthorizeDecorator`, `createAuthGuard` | Engine + getters |

All guards use sync `evaluate()` unless you wrap async evaluation yourself.
