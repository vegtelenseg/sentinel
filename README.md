# @siremzam/sentinel

[![npm version](https://img.shields.io/npm/v/@siremzam/sentinel)](https://www.npmjs.com/package/@siremzam/sentinel)
[![CI](https://github.com/vegtelenseg/sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/vegtelenseg/sentinel/actions/workflows/ci.yml)
[![documentation](https://img.shields.io/badge/docs-sentinel-2563eb)](https://vegtelenseg.github.io/sentinel/)
[![Deploy docs](https://github.com/vegtelenseg/sentinel/actions/workflows/docs.yml/badge.svg?branch=main)](https://github.com/vegtelenseg/sentinel/actions/workflows/docs.yml)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@siremzam/sentinel)
[![license](https://img.shields.io/npm/l/@siremzam/sentinel)](./LICENSE)

**All your permission logic in one place. Type-safe. Multi-tenant. Explainable.**

Stable **1.0** — semver guarantees apply from this release. See [API stability policy](./docs/introduction/api-stability.md).

Most auth libraries give you `create`, `read`, `update`, `delete` and call it a day. Your app has `invoice:approve`, users are admin in one tenant and viewer in another, and when access breaks nobody can tell you why without grepping the codebase.

Sentinel replaces scattered role checks with a single policy engine — domain actions instead of CRUD, tenant-scoped roles by default, and every decision tells you exactly which rule matched and why.

Zero dependencies. ~1,800 lines. 1:1 test-to-code ratio.

---

## Documentation

**Documentation:** [vegtelenseg.github.io/sentinel](https://vegtelenseg.github.io/sentinel/) · [edit on GitHub](./docs/)

| Start here | |
|---|---|
| New to Sentinel | [What is Sentinel?](https://vegtelenseg.github.io/sentinel/introduction/what-is-sentinel) |
| Five-minute setup | [Quickstart](https://vegtelenseg.github.io/sentinel/getting-started/quickstart) |
| How decisions are made | [How evaluation works](https://vegtelenseg.github.io/sentinel/concepts/how-evaluation-works) |
| Try in the browser | [Interactive playground](https://vegtelenseg.github.io/sentinel-example/) |

---

## Install

```bash
npm install @siremzam/sentinel
```

## Quick example

**Without Sentinel** — scattered, fragile, no tenant awareness:

```typescript
app.post("/invoices/:id/approve", async (req, res) => {
  if (
    user.role === "admin" ||
    (user.role === "manager" && invoice.ownerId === user.id)
  ) {
    // which tenant? who knows
  }
});
```

**With Sentinel** — centralized, type-safe, explainable:

```typescript
import { AccessEngine, createPolicyFactory } from "@siremzam/sentinel";
import type { SchemaDefinition, Subject } from "@siremzam/sentinel";

interface AppSchema extends SchemaDefinition {
  roles: "admin" | "member";
  resources: "invoice";
  actions: "invoice:approve" | "invoice:read";
}

const { allow } = createPolicyFactory<AppSchema>();
const engine = new AccessEngine<AppSchema>({ schema: {} as AppSchema });

engine.addRule(
  allow().roles("admin").actions("invoice:approve").on("invoice").build(),
);

const user: Subject<AppSchema> = {
  id: "u1",
  roles: [{ role: "admin", tenantId: "acme" }],
};

engine.evaluate(user, "invoice:approve", "invoice", {}, "acme"); // allowed
```

Protect a route:

```typescript
import { guard } from "@siremzam/sentinel/middleware/express";

app.post(
  "/invoices/:id/approve",
  guard(engine, "invoice:approve", "invoice", {
    getSubject: (req) => req.user,
    getTenantId: (req) => req.headers["x-tenant-id"],
  }),
  handler,
);
```

→ Continue in the [Quickstart](https://vegtelenseg.github.io/sentinel/getting-started/quickstart) for schema design, ABAC conditions, multitenancy, and `explain()`.

---

## Why teams use Sentinel

- **Type-safe schema** — typos in actions fail at compile time, not in production
- **Domain actions** — `invoice:approve`, not generic CRUD
- **Built-in multitenancy** — per-tenant roles; optional `strictTenancy`
- **`explain()`** — per-rule traces when debugging access
- **Audit hooks** — `onDecision` + `toAuditEntry()` for structured logs
- **Zero dependencies** — small surface, easy to review

→ [Why Sentinel?](https://vegtelenseg.github.io/sentinel/introduction/why-sentinel) · [Feature comparison](https://vegtelenseg.github.io/sentinel/comparisons/feature-matrix)

---

## Examples

| Example | Description |
|---|---|
| [standalone](./examples/standalone/) | Engine only — evaluate, permit, explain |
| [express-multi-tenant](./examples/express-multi-tenant/) | HTTP API with tenant header |

---

## Security

Deny by default. Fail closed on condition errors. Frozen rules. See [Security model](https://vegtelenseg.github.io/sentinel/introduction/security) and [SECURITY.md](./SECURITY.md).

---

## Contributing & license

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [API stability policy](./docs/introduction/api-stability.md)
- [Upgrading guide](./docs/getting-started/upgrading.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [MIT](./LICENSE)
