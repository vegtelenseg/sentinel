# The policy factory

[← Documentation home](/)

`createPolicyFactory` returns `allow` and `deny` builders pre-bound to your schema so you write less boilerplate and keep rules readable.

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

Without the factory, each call needs the generic: `allow<AppSchema>()`.

---

## Shorthand on the engine

`AccessEngine` also exposes `.allow()` and `.deny()` with the same builder API for convenience when defining rules inline.

---

## Related

- [RuleBuilder reference](../reference/rule-builder.md)
- [Policy rules](../concepts/policy-rules.md)
