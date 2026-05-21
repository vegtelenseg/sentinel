# Server mode

[← Documentation home](/)

Run Sentinel as a **standalone HTTP service** when non-TypeScript services or edge workers need a central authorization API.

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

Always set `authenticate` in production. Without it, any client on the network can query permissions.

→ [Server reference](../reference/server.md)
