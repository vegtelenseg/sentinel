# Server mode

[← Documentation home](/)

HTTP wrapper around an in-process [`AccessEngine`](../reference/access-engine.md). Use it when other runtimes (Python, Go, edge workers) need authorization without embedding the TypeScript library — they POST a subject and action, get back a [`Decision`](../reference/types.md#decision).

For Express, Fastify, Hono, or NestJS apps written in TypeScript, use [framework middleware](./express.md) and call the engine directly instead.

---

## Create the server

```typescript
import { createAuthServer } from "@siremzam/sentinel/server";

const server = createAuthServer({
  engine,
  port: 3100,
  authenticate: (req) => req.headers["x-api-key"] === process.env.AUTH_SERVER_KEY,
  maxBodyBytes: 1024 * 1024,
});

await server.start();
```

Always set `authenticate` in production. Without it, any client on the network can query permissions.

---

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Status, rules count, uptime |
| `/rules` | GET | Loaded rules (serialization-safe) |
| `/evaluate` | POST | Evaluate authorization request |

### POST `/evaluate` body

```json
{
  "subject": { "id": "u1", "roles": [{ "role": "admin", "tenantId": "acme" }] },
  "action": "invoice:approve",
  "resource": "invoice",
  "resourceContext": {},
  "tenantId": "acme"
}
```

---

## Related

- [Server reference](../reference/server.md)
- [Security model](../introduction/security.md#server-mode-hardening)
- [Middleware guides](./express.md) — in-process alternative
