# Installation

[← Documentation home](/) · Next: [Quickstart](./quickstart.md)

---

## Requirements

- **Node.js** 18 or later
- **TypeScript** 5.x recommended (the library is written in TypeScript; JavaScript works with JSDoc or loosened types)

---

## Install the package

```bash
npm install @siremzam/sentinel
```

```bash
pnpm add @siremzam/sentinel
```

```bash
yarn add @siremzam/sentinel
```

There are **zero runtime dependencies**. What you install is what runs.

---

## Package exports

The main entry exposes the engine, policy builders, types, serialization, and audit helpers:

```typescript
import {
  AccessEngine,
  createPolicyFactory,
  RoleHierarchy,
  toAuditEntry,
  exportRulesToJson,
  importRulesFromJson,
  ConditionRegistry,
} from "@siremzam/sentinel";

import type {
  SchemaDefinition,
  Subject,
  Decision,
} from "@siremzam/sentinel";
```

Optional **subpath imports** keep framework code out of your core bundle unless you need it:

| Import path | Purpose |
|---|---|
| `@siremzam/sentinel/middleware/express` | Express `guard()` middleware |
| `@siremzam/sentinel/middleware/fastify` | Fastify `preHandler` |
| `@siremzam/sentinel/middleware/hono` | Hono middleware |
| `@siremzam/sentinel/middleware/nestjs` | NestJS guard and decorator factories |
| `@siremzam/sentinel/server` | Standalone HTTP auth microservice |

Each middleware module uses minimal inline request types — you do not need `@types/express` installed for Sentinel itself, though your app may already have them.

---

## ESM and CommonJS

The package publishes **ESM** (`import`) and **CommonJS** (`require`) builds. Set `"type": "module"` in your `package.json` if you use native ESM.

---

## Verify the install

Create a minimal script (or run the [standalone example](https://github.com/vegtelenseg/sentinel/tree/main/examples/standalone)):

```bash
npx tsx examples/standalone/main.ts
```

You should see audit lines for allow/deny decisions across tenants.

---

## Next step

[Quickstart](./quickstart.md) — define a schema, add rules, and evaluate your first request.
