# Evaluation cache

[← Documentation home](/)

Enable an LRU cache when the same subject/action/resource/tenant combinations repeat without depending on `resourceContext`.

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

- [Performance](./performance.md)
