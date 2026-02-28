# Express Multi-Tenant Example

A minimal Express app demonstrating `@siremzam/sentinel` in a realistic multi-tenant setup.

## What It Shows

- Schema definition with domain actions (`invoice:approve`, not CRUD)
- Multi-tenant role assignments (same user, different roles per tenant)
- Express middleware integration via `guard()`
- `permitted()` for UI rendering (which buttons to show)
- `explain()` for debugging authorization decisions
- `toAuditEntry()` for structured audit logs

## Run It

```bash
cd examples/express-multi-tenant
npm install
npm start
```

## Try It

```bash
# Health check
curl http://localhost:3050/health

# Switch tenant context — Alice is admin in acme, viewer in globex
# As admin in acme: can approve invoices
curl -H "x-user-id: alice" -H "x-tenant-id: acme" \
  http://localhost:3050/invoices/inv-1/approve -X POST

# As viewer in globex: cannot approve invoices
curl -H "x-user-id: alice" -H "x-tenant-id: globex" \
  http://localhost:3050/invoices/inv-1/approve -X POST

# What can this user do on invoices?
curl -H "x-user-id: alice" -H "x-tenant-id: acme" \
  http://localhost:3050/invoices/permissions

# Debug: full explain trace
curl -H "x-user-id: alice" -H "x-tenant-id: acme" \
  http://localhost:3050/debug/explain?action=invoice:approve&resource=invoice
```
