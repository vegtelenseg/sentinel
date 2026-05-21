# Debugging with `explain()`

[← Documentation home](/)

Production authorization bugs are painful because the answer is often just `false`. `explain()` returns the same decision as `evaluate()` plus a **per-rule trace** — which rules were considered, what matched, and why conditions failed.

---

## Basic usage

```typescript
const result = engine.explain(user, "invoice:approve", "invoice", {}, "tenant-b");

console.log(result.allowed);  // false
console.log(result.reason);   // "No matching rule — default deny"

for (const evalRule of result.evaluatedRules) {
  console.log({
    ruleId: evalRule.rule.id,
    roleMatched: evalRule.roleMatched,
    actionMatched: evalRule.actionMatched,
    resourceMatched: evalRule.resourceMatched,
    conditionResults: evalRule.conditionResults,
    matched: evalRule.matched,
  });
}
```

---

## What to look for

1. **`roleMatched: false`** — user's effective roles in that tenant do not include the rule's roles (check tenant id and hierarchy).
2. **`actionMatched: false`** — typo in action or wildcard pattern does not cover the verb.
3. **`conditionResults[].passed: false`** — ABAC predicate failed; inspect `resourceContext` you passed.
4. **Higher priority deny matched first** — see [Priority and deny resolution](../concepts/priority-and-deny.md).

---

## Async

```typescript
const result = await engine.explainAsync(user, "report:export", "report");
```

---

## In tests

Assert on `reason` and specific rule traces instead of only `allowed`:

```typescript
const ownershipRule = result.evaluatedRules.find(e => e.rule.id === "member-own-invoices");
expect(ownershipRule?.conditionResults[0]?.passed).toBe(false);
```

→ [Testing policies](./testing.md)
