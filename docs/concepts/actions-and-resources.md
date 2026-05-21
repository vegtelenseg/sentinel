# Actions and resources

[← Documentation home](/)

Sentinel separates **what kind of thing** you are touching (resource) from **what you want to do** (action). Together they form a permission check: *can this subject perform this action on this resource?*

---

## Resources

A resource is a **category** in your domain, not a specific database row:

- `"invoice"` — any invoice-shaped object
- `"project"`
- `"settings"`

The resource argument to `evaluate()` is the type. **Instance-specific data** (invoice id, owner, status) goes in `resourceContext`.

```typescript
engine.evaluate(user, "invoice:approve", "invoice", {
  id: "inv_123",
  ownerId: "user-42",
  status: "pending",
});
```

**Why split type and context:** Rules often apply to all invoices of a type (`on("invoice")`) while conditions inspect the particular instance (`ownerId`, `status`).

---

## Actions

Actions use the **`resource:verb`** convention:

| Action | Meaning |
|---|---|
| `invoice:approve` | Approve an invoice |
| `invoice:send` | Send an invoice to a customer |
| `project:archive` | Archive a project |
| `user:impersonate` | Impersonate another user |

Verbs are **domain language**, not HTTP methods and not CRUD unless CRUD is genuinely your model.

### Why not CRUD?

`update` does not distinguish "edit draft" from "approve final version." Separate actions make policies precise and audit logs readable.

---

## Wildcards

Rules can match action patterns:

```typescript
allow()
  .roles("manager")
  .actions("invoice:*" as AppSchema["actions"])
  .on("invoice")
  .build();
```

Patterns compile to regex at `addRule()` time. See [Wildcard actions](../guides/wildcards.md).

---

## Actions vs HTTP routes

One HTTP route should map to **one** action:

```
POST /invoices/:id/approve  →  action: invoice:approve, resource: invoice
DELETE /projects/:id        →  action: project:archive, resource: project
```

Do not reuse a generic `"write"` action across unrelated endpoints — you lose granularity in policies and audits.

---

## Related pages

- [Policy rules](./policy-rules.md)
- [How evaluation works](./how-evaluation-works.md)
