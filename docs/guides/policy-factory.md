# The policy factory

[← Documentation home](/)

Schema-bound `allow` and `deny` entry points save you from writing `allow<AppSchema>()` on every rule. The usual pattern is `createPolicyFactory()` — it returns standalone functions you can use in policy modules before the engine exists.

For the full builder API once you have a chain started, see [`RuleBuilder`](../reference/rule-builder.md).

---

## Usage

```typescript
import { createPolicyFactory } from "@siremzam/sentinel";

const { allow, deny } = createPolicyFactory<AppSchema>();

const rule = allow()
  .roles("admin")
  .actions("invoice:approve")
  .on("invoice")
  .build();
```

Without any schema binding, import `allow` / `deny` from the package directly — but each call needs the generic: `allow<AppSchema>()`.

---

## Shorthand on the engine

If you already have an [`AccessEngine`](../reference/access-engine.md) instance, call `engine.allow()` or `engine.deny()` instead — same [`RuleBuilder`](../reference/rule-builder.md), no separate factory import.

**Prefer `createPolicyFactory`** when rules live in separate modules or you define policies before creating the engine. **Prefer `engine.allow()` / `engine.deny()`** when wiring rules inline during engine setup.

```typescript
const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
});

engine.addRule(
  engine
    .allow()
    .roles("admin")
    .actions("invoice:approve")
    .on("invoice")
    .build(),
);
```

---

## Related

- [RuleBuilder reference](../reference/rule-builder.md)
- [AccessEngine](../reference/access-engine.md)
- [Policy rules](../concepts/policy-rules.md)
