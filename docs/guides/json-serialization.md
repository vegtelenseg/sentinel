# JSON policy serialization

[← Documentation home](/)

Store policy **data** in a database or config service while keeping condition **logic** in code.

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

JSON rules reference conditions by **name**; the registry resolves names to functions at import time.

---

## Related

- [Serialization reference](../reference/serialization.md)
