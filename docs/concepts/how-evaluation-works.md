# How evaluation works

[← Documentation home](/)

Understanding the evaluation pipeline prevents surprises when combining priority, deny rules, conditions, and tenancy. This page walks through **exactly** what happens when you call `engine.evaluate()`.

---

## Entry point

```typescript
const decision = engine.evaluate(
  subject,
  action,
  resource,
  resourceContext?, // default {}
  tenantId?,          // optional
);
```

The same pipeline powers `explain()` and `permitted()` — they differ only in [output shape](../reference/types.md).

---

## Step 1: Resolve subject roles

```
Input: subject.roles, tenantId (optional), roleHierarchy (optional)

1. If tenantId provided:
     Keep assignments where assignment.tenantId === tenantId OR assignment has no tenantId (global)
   Else:
     Use all assignments (unless strictTenancy throws — see multitenancy doc)

2. Collect role names from filtered assignments

3. If roleHierarchy configured:
     Expand each role to include inherited roles (e.g. admin → manager → member)

Output: Set of effective role names
```

If the effective set is empty, only rules with `anyRole()` or `roles: "*"` can match on the role axis.

---

## Step 2: Find candidate rules

For each compiled rule, check:

| Check | Pass when |
|---|---|
| Role | Rule roles is `"*"` OR intersects effective roles |
| Action | Rule actions is `"*"` OR exact match OR wildcard regex matches |
| Resource | Rule resources is `"*"` OR includes requested resource |

Rules that fail any check are not candidates.

Wildcard patterns like `invoice:*` were compiled to `RegExp` at `addRule()` — no per-request regex compilation cost.

---

## Step 3: Sort candidates

Candidates are sorted before evaluation:

1. **Higher `priority` first** (default priority is `0`)
2. At **equal priority**, **`deny` before `allow`**

This ordering implements "deny wins at the same priority level."

---

## Step 4: First match wins

Candidates are evaluated **in sorted order**. The **first** rule that fully matches determines the outcome.

For each candidate:

1. If the rule has **no conditions** → it matches immediately; stop.
2. If the rule has **conditions** → evaluate each in order:
   - Sync: must return `true`
   - Async: not allowed in sync `evaluate()` — use `evaluateAsync()`
   - Thrown error → treated as `false`, optional `onConditionError` callback
   - All must pass → rule matches; stop
   - Any fails → try next candidate

---

## Step 5: Default effect

If **no candidate** matched:

- `defaultEffect: "deny"` (default) → `allowed: false`, `effect: "default-deny"`
- `defaultEffect: "allow"` → `allowed: true`

Most applications leave deny as default.

---

## Step 6: Build the Decision

The returned `Decision` includes:

- `allowed`, `effect`, `matchedRule`, `reason`
- `durationMs`, `timestamp`
- Echo of `subject`, `action`, `resource`, `resourceContext`, `tenantId`

`onDecision` listeners fire for every evaluation.

---

## Cache interaction

If `cacheSize > 0`, unconditional results may be served from LRU cache keyed by subject, action, resource, tenant. Conditional paths bypass cache. Rule changes clear the cache.

→ [Evaluation cache](../guides/evaluation-cache.md)

---

## Mental model diagram

```
evaluate(subject, action, resource, ctx, tenantId)
        │
        ▼
  Resolve roles (+ hierarchy, tenant filter)
        │
        ▼
  Filter rules → candidates (role ∧ action ∧ resource)
        │
        ▼
  Sort by priority ↓, deny before allow at tie
        │
        ▼
  For each candidate in order:
        ├─ conditions pass? ──yes──► return allow/deny from rule
        └─ no ──► next candidate
        │
        ▼
  No match → default deny (or allow)
```

---

## Related pages

- [Priority and deny resolution](./priority-and-deny.md)
- [Conditions](./conditions.md)
- [Debugging with explain()](../guides/explain-and-debugging.md)
