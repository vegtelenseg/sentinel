# Audit logging

[← Documentation home](/)

Every evaluation produces a full [`Decision`](../reference/types.md#decision). For persistence and log pipelines, convert it to an [`AuditEntry`](../reference/types.md#auditentry) with `toAuditEntry()` — strips functions and nested objects so the result is safe for `JSON.stringify`.

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

`toAuditEntry()` strips functions and nested objects from the full [`Decision`](../reference/types.md#decision):

```typescript
{
  allowed: true,
  effect: "allow",
  matchedRuleId: "admin-all",
  matchedRuleDescription: "Admins can approve invoices",
  subjectId: "user-42",
  action: "invoice:approve",
  resource: "invoice",
  tenantId: "acme",
  timestamp: 1716499200000,
  durationMs: 0.012,
  reason: "Matched rule: Admins can approve invoices",
}
```

On default deny, `matchedRuleId` and `matchedRuleDescription` are `null`.

---

## Related

- [Types: AuditEntry](../reference/types.md#auditentry)
- [Security model](../introduction/security.md)
- [How evaluation works](../concepts/how-evaluation-works.md)
