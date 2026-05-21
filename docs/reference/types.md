# Types

[← Documentation home](/)

## SchemaDefinition

```typescript
interface SchemaDefinition {
  roles: string;
  resources: string;
  actions: `${string}:${string}`;
  tenantId?: string;
}
```

## Subject

```typescript
interface Subject<S> {
  id: string;
  roles: RoleAssignment<S>[];
  attributes?: Record<string, unknown>;
}
```

## Decision

Returned by `evaluate()`:

- `allowed`, `effect`, `matchedRule`, `reason`
- `durationMs`, `timestamp`
- `subject`, `action`, `resource`, `resourceContext`, `tenantId`

## ExplainResult

Returned by `explain()`:

- Same top-level fields as decision outcome
- `evaluatedRules: RuleEvaluation[]` with `roleMatched`, `actionMatched`, `resourceMatched`, `conditionResults`, `matched`

## AuditEntry

From `toAuditEntry(decision)` — JSON-safe subset for logging.
