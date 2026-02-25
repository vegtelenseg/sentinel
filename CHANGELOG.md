# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
