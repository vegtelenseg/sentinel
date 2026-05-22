# Upgrading

[← Documentation home](/) · [Installation](./installation.md)

This guide covers version-to-version changes. For migrating from other libraries, see [Comparisons](/comparisons/feature-matrix).

---

## 0.4 → 1.0

**Breaking:** the `asyncConditions` engine option has been removed.

Runtime async detection already handles async conditions — use `evaluateAsync()`, `explainAsync()`, or `permittedAsync()` when rules contain promise-returning conditions.

**Before (0.4.x):**

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  asyncConditions: true,
});

await engine.evaluateAsync(user, "invoice:approve", "invoice");
```

**After (1.0.0):**

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
});

await engine.evaluateAsync(user, "invoice:approve", "invoice");
```

If you call sync methods (`evaluate`, `explain`, `permitted`) against async conditions, the engine throws with a message pointing to the async API — no opt-in flag required.

→ [AccessEngine reference](/reference/access-engine) · [Async conditions](/guides/async-conditions)

---

## 0.3 → 0.4

**Behavior change:** async conditions no longer fail silently when used with sync APIs.

- `evaluateAsync()` and `explainAsync()` work without the `asyncConditions` flag
- Calling `evaluate()` on async conditions throws a clear error (or use `*Async` methods)
- The `asyncConditions` option was deprecated in 0.4.0 and removed in 1.0.0

**Migration:**

1. Replace `engine.evaluate(...)` with `engine.evaluateAsync(...)` wherever conditions return promises
2. Remove `asyncConditions: true` from engine options (required before 1.0.0)

---

## Related pages

- [API stability policy](/introduction/api-stability)
- [CHANGELOG](https://github.com/vegtelenseg/sentinel/blob/main/CHANGELOG.md)
