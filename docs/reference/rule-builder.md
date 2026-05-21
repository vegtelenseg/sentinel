# RuleBuilder

[← Documentation home](/)

Created via `allow()`, `deny()`, or `createPolicyFactory()`.

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
