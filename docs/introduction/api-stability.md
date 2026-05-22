# API stability

[← Documentation home](/)

Starting with **1.0.0**, `@siremzam/sentinel` follows [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.x) — bug fixes, no API changes
- **Minor** (1.x.0) — backward-compatible additions
- **Major** (x.0.0) — breaking changes

---

## Stable surface

These are covered by semver guarantees:

- Public exports from the main entry (`AccessEngine`, `createPolicyFactory`, types, serialization helpers)
- Subpath exports: `@siremzam/sentinel/middleware/*` and `@siremzam/sentinel/server`
- Shapes of `Decision`, `ExplainResult`, `AuditEntry`, and middleware option interfaces
- Evaluation semantics documented in [How evaluation works](/concepts/how-evaluation-works)

---

## Not semver-guaranteed

- Undocumented behavior or internal implementation details
- Exact wording of error messages (may improve in patches)
- Performance characteristics (benchmarks are informational, not a contract)

---

## Deprecation policy

Breaking removals go through a deprecation cycle:

1. Mark the API `@deprecated` in TypeScript JSDoc
2. Document the replacement in [Upgrading](/getting-started/upgrading)
3. Remove in the next **major** release

---

## Related pages

- [Upgrading guide](/getting-started/upgrading)
- [Security model](/introduction/security)
- [CHANGELOG](https://github.com/vegtelenseg/sentinel/blob/main/CHANGELOG.md)
