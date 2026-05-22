# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| 0.4.x   | Yes (security fixes only until next major) |
| < 0.4   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public GitHub issue.**

Instead, email **mzam.siya@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce
- The potential impact
- Any suggested fix (if you have one)

You should receive an acknowledgment within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Security Design

This library follows these security principles:

- **Deny by default.** If no rule matches, access is denied.
- **Fail closed.** If a condition function throws, it evaluates to `false`.
- **Immutable rules.** Rules are `Object.freeze`'d on add — mutation after insertion is impossible.
- **Cache safety.** Only unconditional evaluations are cached. Conditional results are always re-evaluated.
- **Strict tenancy.** Optional mode throws if `tenantId` is omitted for subjects with tenant-scoped roles.
- **Import validation.** `importRulesFromJson()` validates all fields and rejects malformed input.
- **Server hardening.** `createAuthServer` supports authentication callbacks and body size limits.

## Scope

This library handles **authorization** (what a user can do), not **authentication** (who the user is). It assumes the calling code has already authenticated the user and provides a valid `Subject` object.
