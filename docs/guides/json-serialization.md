# JSON policy serialization

[← Documentation home](/)

Split **what** is stored (rule metadata in JSON) from **how** conditions run (TypeScript functions you register at import time). JSON rules reference conditions by name; a `ConditionRegistry` maps those names to implementations you control.

For the full API table, see [Serialization reference](../reference/serialization.md).

---

## Export

```typescript
import { exportRulesToJson } from "@siremzam/sentinel";

const json = exportRulesToJson(engine.getRules());
await db.policies.save({ tenantId: "acme", document: json });
```

---

## Import

```typescript
import { importRulesFromJson, ConditionRegistry } from "@siremzam/sentinel";

const conditions = new ConditionRegistry<AppSchema>();
conditions.register("isOwner", (ctx) => ctx.subject.id === ctx.resourceContext.ownerId);

const rules = importRulesFromJson<AppSchema>(json, conditions);
engine.addRules(...rules);
```

Each name in the JSON must be registered before import — unregistered names fail at load time, not silently at evaluation.

---

## Related

- [Serialization reference](../reference/serialization.md)
- [Conditions: JSON policies](../concepts/conditions.md#json-policies)
- [Security model](../introduction/security.md#json-import-validation)
