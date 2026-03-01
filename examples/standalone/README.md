# Standalone Example

The fastest way to see `@siremzam/sentinel` in action — no HTTP server, just authorization logic.

## What It Shows

- Schema definition with domain actions
- Role hierarchy (owner → admin → member → viewer)
- Multi-tenant role assignments
- Priority-based deny overrides
- `permitted()` for UI rendering
- `explain()` for debugging why a decision was made
- `onDecision` audit logging

## Run It

```bash
cd examples/standalone
npm install
npm start
```

## Expected Output

```
─── Alice in Acme (admin) ───
  [audit] ALLOW invoice:read on invoice ...
  [audit] ALLOW invoice:approve on invoice ...
  [audit] DENY project:archive on project ...

─── Alice in Globex (viewer) ───
  [audit] ALLOW invoice:read on invoice ...
  [audit] DENY invoice:approve on invoice ...

─── Bob in Acme (owner) ───
  [audit] ALLOW invoice:approve on invoice ...
  [audit] ALLOW project:archive on project ...
  [audit] ALLOW settings:update on settings ...

─── What can Alice do with invoices in Acme? ───
  Permitted: { invoice:create, invoice:read, invoice:approve }

─── Why can't Alice archive in Acme? ───
  Allowed: false
  Reason: Matched rule "no-archive": Archiving is disabled for now
```
