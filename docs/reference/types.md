# Types

[← Documentation home](/)

Main TypeScript shapes from authorization checks. Define [`AppSchema`](../concepts/schema.md) once; these types follow from that generic through [`AccessEngine`](./access-engine.md) and [`Subject`](../concepts/subjects-and-roles.md).

**How they relate:** `evaluate()` → [`Decision`](#decision). `explain()` → [`ExplainResult`](#explainresult) (a `Decision` plus a per-rule trace). `toAuditEntry()` → [`AuditEntry`](#auditentry) (a JSON-safe slice of a `Decision` for logging).

---

## SchemaDefinition

The base interface every app schema extends. Defines the unions for roles, resources, and actions.

```typescript
interface SchemaDefinition {
  roles: string;
  resources: string;
  actions: `${string}:${string}`;
  tenantId?: string;
}
```

See [The schema](../concepts/schema.md) for how to define and evolve `AppSchema`.

---

## Subject

Who is requesting access. Built in your auth layer and passed to every evaluation.

```typescript
interface Subject<S> {
  id: string;
  roles: RoleAssignment<S>[];
  attributes?: Record<string, unknown>;
}
```

```typescript
const user: Subject<AppSchema> = {
  id: "user-42",
  roles: [{ role: "admin", tenantId: "acme" }],
  attributes: { department: "finance" },
};
```

→ [Subjects and roles](../concepts/subjects-and-roles.md)

---

## Decision

The outcome of one authorization check — from [`evaluate()` / `evaluateAsync()`](./access-engine.md#methods):

| Field | Description |
|---|---|
| `allowed` | Whether access was granted |
| `effect` | `"allow"`, `"deny"`, or `"default-deny"` |
| `matchedRule` | The rule that decided, or `null` |
| `reason` | Human-readable explanation |
| `durationMs`, `timestamp` | Timing metadata |
| `subject`, `action`, `resource`, `resourceContext`, `tenantId` | Echo of the request |

Use `decision.allowed` in application code. Use `reason` and `matchedRule` when logging or debugging.

---

## ExplainResult

Same fields as a [`Decision`](#decision), plus a per-rule trace — from [`explain()` / `explainAsync()`](./access-engine.md#methods):

- `evaluatedRules: RuleEvaluation[]` — per-rule trace with `roleMatched`, `actionMatched`, `resourceMatched`, `conditionResults`, and `matched`

→ [Debugging with `explain()`](../guides/explain-and-debugging.md)

---

## AuditEntry

JSON-safe slice of a [`Decision`](#decision) for log pipelines — from [`toAuditEntry()`](../guides/audit-logging.md), not returned directly by the engine:

```typescript
{
  allowed: true,
  effect: "allow",
  matchedRuleId: "admin-all",
  matchedRuleDescription: "Full admin access",
  subjectId: "user-42",
  action: "invoice:approve",
  resource: "invoice",
  tenantId: "acme",
  timestamp: 1716499200000,
  durationMs: 0.012,
  reason: "Matched rule: Full admin access",
}
```

→ [Audit logging](../guides/audit-logging.md)

---

## Related

- [AccessEngine](./access-engine.md)
- [The schema](../concepts/schema.md)
- [Subjects and roles](../concepts/subjects-and-roles.md)
- [How evaluation works](../concepts/how-evaluation-works.md)
