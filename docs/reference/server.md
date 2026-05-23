# Server

[← Documentation home](/)

HTTP API for an in-process [`AccessEngine`](./access-engine.md). Non-TypeScript clients POST authorization requests and receive a [`Decision`](./types.md#decision) — use this instead of embedding the library when the caller cannot run TypeScript.

For TypeScript apps, prefer [framework middleware](../guides/express.md) and call the engine directly.

---

## `createAuthServer(options)`

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

**Always set `authenticate` in production** — without it, any client on the network can call `/evaluate`. See [Server mode hardening](../introduction/security.md#server-mode-hardening).

| Option | Description |
|---|---|
| `engine` | `AccessEngine` instance |
| `port` / `host` | Listen address |
| `authenticate` | `(req) => boolean` before handling |
| `maxBodyBytes` | Body limit (default 1 MB) |
| `resolveSubject` | Custom body → `Subject` mapping |

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

The response mirrors a [`Decision`](./types.md#decision) — same fields as [`evaluate()`](./access-engine.md#methods) in-process.

---

## Related

- [Server mode guide](../guides/server-mode.md)
- [AccessEngine](./access-engine.md)
- [Security model](../introduction/security.md)
