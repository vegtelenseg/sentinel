# Policy rules

[← Documentation home](/)

A **policy rule** is the atomic unit of authorization in Sentinel. The engine holds an ordered list of rules; evaluation finds the **first matching rule** after sorting by priority and applies its effect (`allow` or `deny`).

---

## Anatomy of a rule

Built with the fluent API:

```typescript
allow()
  .id("admin-full-access")
  .roles("admin", "owner")
  .actions("invoice:approve", "invoice:read")
  .on("invoice")
  .when(ctx => ctx.resourceContext.status !== "locked")
  .priority(5)
  .describe("Admins can work with unlocked invoices")
  .build();
```

| Field | Meaning |
|---|---|
| `id` | Stable identifier for tests and explain traces |
| `effect` | `"allow"` or `"deny"` |
| `roles` | Specific roles, or `"*"` for any role |
| `actions` | Specific actions, `"*"`, or patterns with `*` |
| `resources` | Specific resources, or `"*"` |
| `conditions` | Optional predicates — all must pass |
| `priority` | Higher runs first (default `0`) |
| `description` | Human-readable text in decisions and audits |

---

## Allow vs deny

Both are first-class. Use **deny** for broad safety rails and **allow** with higher priority for exceptions:

```typescript
deny()
  .anyRole()
  .actions("user:impersonate")
  .on("user")
  .describe("Impersonation disabled by default")
  .build(),

allow()
  .roles("owner")
  .actions("user:impersonate")
  .on("user")
  .priority(10)
  .describe("Owners may impersonate for support")
  .build(),
```

→ [Priority and deny resolution](./priority-and-deny.md)

---

## Matching dimensions

A rule **candidate** must match on three axes before conditions run:

1. **Role** — subject's resolved roles intersect rule roles (or rule is `anyRole()`)
2. **Action** — requested action equals listed action, matches wildcard regex, or rule is `anyAction()`
3. **Resource** — requested resource is listed or rule is `anyResource()`

If any axis fails, the rule is skipped for that evaluation.

---

## Multiple conditions

Each `.when()` appends a condition. **All** must return true (AND semantics).

```typescript
allow()
  .roles("member")
  .actions("invoice:update")
  .on("invoice")
  .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
  .when(ctx => ctx.resourceContext.status !== "finalized")
  .build();
```

---

## Rule lifecycle

```typescript
engine.addRule(rule);
engine.addRules(ruleA, ruleB);
engine.removeRule("admin-full-access");
engine.getRules();  // readonly frozen copies
engine.clearRules();
```

Rules are **frozen** on add. The engine clears the evaluation cache when rules change.

---

## Related pages

- [RuleBuilder reference](../reference/rule-builder.md)
- [Conditions (ABAC)](./conditions.md)
- [Policy factory](../guides/policy-factory.md)
