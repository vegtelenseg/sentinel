# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-03-23

### Added

- Runtime detection for async conditions — `evaluate()` and `explain()` throw a clear error when they encounter an async condition, guiding you to use `evaluateAsync()` or `explainAsync()` instead of failing silently
- `evaluateAsync()` and `explainAsync()` now work without the `asyncConditions` flag — no opt-in required

### Deprecated

- `asyncConditions` engine option — will be removed in v2. Async conditions are now detected automatically; use the `*Async` methods when you have async conditions.

### Fixed

- Silent deny when async conditions were used with sync APIs without the `asyncConditions` flag — now throws with a helpful error message

## [0.3.3] - 2026-03-01

### Added

- Hono middleware (`@siremzam/sentinel/middleware/hono`) with `honoGuard()` factory
- Tests for Hono middleware (6 tests: allow, deny, 401, custom onDenied, tenantId/resourceContext, engine error)

## [0.3.2] - 2026-03-01

### Added

- README rewrite: badges, table of contents, "What's New" callout, prominent playground link
- "How Evaluation Works" section with step-by-step algorithm walkthrough
- Concepts glossary for authorization newcomers (collapsible)
- "Patterns & Recipes" section with 6 real-world scenarios (ownership, time-gated access, feature flags, async quota checks, broad deny overrides, IP-based restrictions)
- "Testing Your Policies" section showing `explain()` in vitest
- Migration guide from CASL, Casbin, and accesscontrol
- "When NOT to Use This" section with honest boundary-setting
- Performance section with real benchmark numbers
- Standalone example (`examples/standalone/`) — single-file, no HTTP server

### Changed

- Features restructured into Core / Observability / Integration / Performance tiers
- Server Mode section expanded with polyglot use-case framing
- `{} as MySchema` pattern explained in Quick Start
- `schema` option description updated in API Reference

## [0.3.1] - 2026-02-28

### Added

- CommonJS build output alongside ESM for wider compatibility
- ESLint flat config with typescript-eslint
- Automated npm publish workflow with provenance
- `.npmrc` with `access=public` for scoped package

### Fixed

- `"require"` and `"default"` conditions added to all package.json exports
- CI now runs lint checks
- Coverage results uploaded as CI artifacts

### Changed

- Build tool switched from tsc to tsup for dual ESM/CJS output

## [0.3.0] - 2026-02-27

### Added

- Benchmark suite (`benchmarks/run.ts`) covering 100, 1,000, and 10,000 rule scenarios
- Comparison table vs Casbin, accesscontrol, and CASL in README
- Security policy (SECURITY.md)
- Contributing guide (CONTRIBUTING.md)
- GitHub Actions CI workflow
- Minimal example app (`examples/express-multi-tenant`)

### Changed

- README rewritten for clarity: quick start, comparison, security section, philosophy
- Package version bumped to 0.3.0 for first public release

## [0.2.0] - 2026-01-24

### Added

- `createPolicyFactory<S>()` — schema-bound `allow()` and `deny()` without generic noise
- `engine.permitted()` and `engine.permittedAsync()` — "what can this user do?" for UI rendering
- `engine.explain()` and `engine.explainAsync()` — full evaluation trace for debugging
- `toAuditEntry()` — converts Decision to serialization-safe AuditEntry
- `onConditionError` callback — surfaces silent condition failures
- `strictTenancy` mode — throws if tenantId omitted for tenant-scoped subjects
- Pre-compiled wildcard action regexes at `addRule()` time
- Server authentication hook (`authenticate` callback)
- Server body size limit (`maxBodyBytes`, default 1 MB)
- Import validation for `effect` field in `importRules()`

### Fixed

- Cache only stores evaluations of unconditional rules (prevents stale cache with resourceContext)
- Rules frozen with `Object.freeze` on add (prevents post-insertion mutation)

## [0.1.0] - 2026-01-06

### Added

- Core `AccessEngine` with synchronous and asynchronous evaluation
- Fluent `RuleBuilder` with `.roles()`, `.actions()`, `.on()`, `.when()`, `.priority()`
- `RoleHierarchy` with cycle detection
- LRU evaluation cache (conditional rules excluded)
- JSON policy serialization with `ConditionRegistry`
- HTTP authorization server (`createAuthServer`) on Node built-in `http`
- Express, Fastify, and NestJS middleware
- Fluent check API: `engine.can(user).perform(action).on(resource)`
- `onDecision` observability hook
- Multi-tenant role resolution
- Wildcard action patterns (`invoice:*`, `*:read`)
- Zero runtime dependencies
