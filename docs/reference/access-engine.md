# AccessEngine

[← Documentation home](/)

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
| `allow()` / `deny()` | Rule builders |
| `clearCache()` | Clear LRU |
| `cacheStats` | `{ size, maxSize }` or null |
