# AccessEngine

[← Documentation home](/)

Central authorization engine: holds your policy rules and answers *can this subject perform this action on this resource?* Returns a [`Decision`](./types.md#decision) (or [`ExplainResult`](./types.md#explainresult) when debugging).

Create one instance per app (or per domain), add rules, then call `evaluate()` from HTTP middleware, jobs, or UI code. See [How evaluation works](../concepts/how-evaluation-works.md) for the matching pipeline.

---

## Constructor

```typescript
new AccessEngine<S>(options: AccessEngineOptions<S>)
```

### AccessEngineOptions

| Option | Default | Description |
|---|---|---|
| `schema` | required (type anchor) | `SchemaDefinition` for inference |
| `defaultEffect` | `"deny"` | Effect when no rule matches |
| `onDecision` | — | Listener on every evaluation |
| `onConditionError` | — | When a condition throws |
| `strictTenancy` | `false` | Throw if `tenantId` omitted when required |
| `roleHierarchy` | — | `RoleHierarchy<S>` instance |
| `cacheSize` | `0` (off) | LRU capacity |

## Methods

| Method | Description |
|---|---|
| `addRule(rule)` | Add one rule (frozen) |
| `addRules(...rules)` | Add multiple |
| `removeRule(id)` | Remove by id |
| `getRules()` | Readonly frozen rules |
| `clearRules()` | Remove all |
| `evaluate(subject, action, resource, ctx?, tenantId?)` | Sync evaluation |
| `evaluateAsync(...)` | Async evaluation |
| `permitted(subject, resource, actions[], ctx?, tenantId?)` | Allowed actions as `Set` |
| `permittedAsync(...)` | Async variant |
| `explain(...)` | Evaluation + trace |
| `explainAsync(...)` | Async variant |
| `can(subject)` | Fluent check helper |
| `onDecision(listener)` | Subscribe; returns unsubscribe |
| `allow()` / `deny()` | Return a [`RuleBuilder`](./rule-builder.md) bound to this engine's schema |
| `clearCache()` | Clear LRU |
| `cacheStats` | `{ size, maxSize }` or null |

---

## Related

- [Policy factory](../guides/policy-factory.md) — `createPolicyFactory` and engine shorthand
- [How evaluation works](../concepts/how-evaluation-works.md)
- [Types](./types.md) — `Decision`, `ExplainResult`
- [Evaluation cache](../guides/evaluation-cache.md)
- [Debugging with `explain()`](../guides/explain-and-debugging.md)
