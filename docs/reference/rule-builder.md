# RuleBuilder

[← Documentation home](/)

Fluent API for defining a single policy rule. Start with `allow()` or `deny()`, chain constraints, then call `.build()` to get a `PolicyRule`.

To skip the `<AppSchema>` generic on every call, use schema-bound builders from [`createPolicyFactory()`](../guides/policy-factory.md) or [`AccessEngine.allow()` / `.deny()`](./access-engine.md#methods) — they return the same `RuleBuilder` with methods below.

| Method | Description |
|---|---|
| `.id(id)` | Rule identifier |
| `.roles(...roles)` | Restrict to roles |
| `.anyRole()` | Match any role |
| `.actions(...actions)` | Actions (supports `*` wildcards) |
| `.anyAction()` | Any action |
| `.on(...resources)` | Resource types |
| `.anyResource()` | Any resource |
| `.when(condition)` | Add condition (AND with others) |
| `.priority(n)` | Higher checked first |
| `.describe(text)` | Human-readable description |
| `.build()` | Returns `PolicyRule` |

---

## Related

- [Policy factory](../guides/policy-factory.md)
- [Policy rules](../concepts/policy-rules.md)
- [AccessEngine](../reference/access-engine.md)
