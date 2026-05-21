# Security model

[← Documentation home](/) · See also [SECURITY.md](https://github.com/vegtelenseg/sentinel/blob/main/SECURITY.md)

Authorization libraries sit on your security boundary. Sentinel defaults and invariants are documented here so you can threat-model without reading the implementation.

---

## Deny by default

If **no rule matches** a request, the effect is **deny** (`default-deny`). You can set `defaultEffect: "allow"` in engine options, but the default is deny — the common secure choice for SaaS.

Unmatched requests produce a clear reason: `"No matching rule — default deny"`.

---

## Fail closed on condition errors

When a condition function **throws**, the engine treats it as **`false`** — access is not granted because a check failed loudly.

Optionally register `onConditionError` to log `ruleId`, `conditionIndex`, and the error without changing the deny outcome.

**Why:** A bug in a condition must not become accidental allow. Silent success on thrown errors would be privilege escalation.

---

## Immutable rules after insertion

`addRule()` **freezes** each rule with `Object.freeze()`. Mutating a rule object after registration does not change engine behavior.

**Why:** Shared rule arrays passed from config loaders cannot be tampered with at runtime by unrelated code.

---

## Cache safety

The optional LRU cache (`cacheSize`) only stores results for evaluations where **no condition ran** on the matching path — context-independent allows/denies.

Conditional evaluations are **never cached**, because the same subject/action/resource can allow or deny depending on `resourceContext`.

Adding or removing rules **clears** the cache.

---

## Strict tenancy

With `strictTenancy: true`, evaluating a subject that has tenant-scoped role assignments **without** passing `tenantId` throws instead of guessing.

**Why:** Omitting tenant context should fail in development, not leak the wrong role set into production.

---

## JSON import validation

`importRulesFromJson()` validates structure and rejects invalid `effect` values. Conditions resolve only through a **`ConditionRegistry`** you control — arbitrary code is not deserialized from JSON.

---

## Server mode hardening

`createAuthServer()` supports:

- `authenticate(req)` — reject unauthenticated callers before evaluation
- `maxBodyBytes` — bound request body size (default 1 MB)

Without `authenticate`, every client that can reach the port can call `/evaluate`. Use only on trusted networks or behind mutual TLS.

---

## What Sentinel does not provide

- **Authentication** — you must establish identity before calling `evaluate()`
- **Rate limiting** — protect the auth server and HTTP routes separately
- **Encryption** — transport security is your TLS layer
- **Policy signing** — if you load rules from a database, protect integrity at the storage layer

---

## Responsible disclosure

Report security issues per [SECURITY.md](https://github.com/vegtelenseg/sentinel/blob/main/SECURITY.md).
