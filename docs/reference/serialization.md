# Serialization

[← Documentation home](/)

Export policy **data** to JSON for databases or config services. Import it back at runtime by resolving condition **names** through a `ConditionRegistry` you control — condition **logic** stays in TypeScript, not in the serialized document.

**When to serialize:** Multi-tenant policy storage, admin UIs that edit rules, or hot-reloading without redeploying. **When to keep rules in code:** Small apps or policies tightly coupled to condition implementations.

See the [JSON policy serialization guide](../guides/json-serialization.md) for a walkthrough.

---

## API

| Export | Purpose |
|---|---|
| `exportRules` / `exportRulesToJson` | Rules → JSON document |
| `importRules` / `importRulesFromJson` | JSON → rules |
| `ConditionRegistry` | Name → condition function |

`JsonPolicyDocument` version is `1`. Conditions in JSON are string names resolved at import time — arbitrary functions are never deserialized from JSON.

---

## Example

```typescript
import {
  exportRulesToJson,
  importRulesFromJson,
  ConditionRegistry,
} from "@siremzam/sentinel";

// Export after building rules in code
const json = exportRulesToJson(engine.getRules());
await db.policies.save({ tenantId: "acme", document: json });

// Import with a registry you define
const conditions = new ConditionRegistry<AppSchema>();
conditions.register("isOwner", (ctx) => ctx.subject.id === ctx.resourceContext.ownerId);

const rules = importRulesFromJson<AppSchema>(json, conditions);
engine.addRules(...rules);
```

---

## Related

- [JSON policy serialization guide](../guides/json-serialization.md)
- [Conditions (ABAC)](../concepts/conditions.md) — `#json-policies`
- [Security model](../introduction/security.md) — JSON import validation
