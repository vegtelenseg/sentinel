# Server

[← Documentation home](/)

## `createAuthServer(options)`

| Option | Description |
|---|---|
| `engine` | `AccessEngine` instance |
| `port` / `host` | Listen address |
| `authenticate` | `(req) => boolean` before handling |
| `maxBodyBytes` | Body limit (default 1 MB) |
| `resolveSubject` | Custom body → `Subject` mapping |

## Endpoints

- `GET /health`
- `GET /rules`
- `POST /evaluate`

See [Server mode guide](../guides/server-mode.md).
