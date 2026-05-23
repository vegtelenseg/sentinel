# Conditions (ABAC)

[← Documentation home](/)

**RBAC** answers: "Does this user have a role that permits this action?" **ABAC** (Attribute-Based Access Control) adds: "...and do the attributes of the subject, resource, and environment satisfy extra predicates?"

In Sentinel, ABAC is implemented as **conditions** — predicate functions on [`EvaluationContext`](#evaluation-context). Attach them with `.when()` on a [`RuleBuilder`](../reference/rule-builder.md).

---

## Evaluation context

Conditions receive one argument:

```typescript
interface EvaluationContext<S> {
  subject: Subject<S>;
  action: InferAction<S>;
  resource: InferResource<S>;
  resourceContext: ResourceContext;
  tenantId?: string;
  environment?: Record<string, unknown>;
}
```

Use `resourceContext` for per-resource facts (owner id, status, amount). Use `subject.attributes` for user facts loaded at session time. Use `environment` for request-scoped data you inject before evaluation (IP, time, feature flags).

---

## Sync conditions

```typescript
allow()
  .roles("member")
  .actions("invoice:update")
  .on("invoice")
  .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
  .when(ctx => ctx.resourceContext.status !== "finalized")
  .build();
```

All `.when()` calls on a rule are **AND**ed. There is no built-in OR across conditions on one rule — use two rules or combine logic inside one function.

---

## Async conditions

When a condition needs I/O:

```typescript
.when(async (ctx) => {
  const quota = await db.getExportQuota(ctx.subject.id);
  return quota.remaining > 0;
})
```

You **must** use the async evaluation methods — not the sync ones:

| Sync (throws if async condition) | Async |
|---|---|
| `evaluate()` | `evaluateAsync()` |
| `explain()` | `explainAsync()` |
| `permitted()` | `permittedAsync()` |

---

## Fail-closed semantics

If a condition **throws**, it is treated as **`false`**. Access is not granted.

Register `onConditionError` to log without changing outcome:

```typescript
const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  onConditionError: ({ ruleId, conditionIndex, error }) => {
    logger.warn("Condition error", { ruleId, conditionIndex, error });
  },
});
```

---

## Conditions and caching

Evaluations that run conditions are **not cached**. Only unconditional paths can hit the LRU cache.

→ [Evaluation cache](../guides/evaluation-cache.md)

---

## JSON policies

Serialized rules reference conditions **by name**. Register implementations in a `ConditionRegistry` at import time — the registry is your security boundary; arbitrary code is never loaded from JSON.

```typescript
const conditions = new ConditionRegistry<AppSchema>();
conditions.register("isOwner", (ctx) => ctx.subject.id === ctx.resourceContext.ownerId);

const rules = importRulesFromJson<AppSchema>(storedJson, conditions);
engine.addRules(...rules);
```

→ [JSON policy serialization](../guides/json-serialization.md) · [Serialization reference](../reference/serialization.md)

---

## Related pages

- [Async conditions](../guides/async-conditions.md)
- [Ownership pattern](../patterns/ownership.md)
