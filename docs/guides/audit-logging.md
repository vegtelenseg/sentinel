# Audit logging

[← Documentation home](/)

Every evaluation can emit a structured **`Decision`**. For persistence and log pipelines, convert to an **`AuditEntry`** with `toAuditEntry()` — no functions, safe for `JSON.stringify`.

---

## `onDecision` hook

```typescript
import { toAuditEntry } from "@siremzam/sentinel";

const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  onDecision: (decision) => {
    auditLog.write(toAuditEntry(decision));
  },
});
```

Subscribe at runtime:

```typescript
const unsubscribe = engine.onDecision((d) => { /* ... */ });
unsubscribe();
```

---

## Audit entry fields

- `allowed`, `effect`, `reason`, `durationMs`, `timestamp`
- `matchedRuleId`, `matchedRuleDescription`
- `subjectId`, `action`, `resource`, `tenantId`

---

## Related

- [Types reference](../reference/types.md)
