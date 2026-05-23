# Evaluation cache

[← Documentation home](/)

Optional LRU cache inside [`AccessEngine`](../reference/access-engine.md) that memoizes **unconditional** evaluation results. Enable it when the same subject/action/resource/tenant combinations repeat and matching rules do not depend on `resourceContext`.

Conditional evaluations always bypass the cache — see [Conditions and caching](../concepts/conditions.md#conditions-and-caching).

---

## Enable

```typescript
const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  cacheSize: 1000,
});

engine.evaluate(user, "invoice:read", "invoice"); // miss
engine.evaluate(user, "invoice:read", "invoice"); // hit

engine.cacheStats; // { size, maxSize }
engine.clearCache();
```

---

## What is cached

Only evaluations where the matching path does **not** depend on conditions (context-independent). Conditional rules always re-run.

Adding or removing rules **clears** the cache automatically.

---

## Related

- [Performance and benchmarks](./performance.md)
- [How evaluation works](../concepts/how-evaluation-works.md#cache-interaction)
- [AccessEngine reference](../reference/access-engine.md)
