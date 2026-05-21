# Performance and benchmarks

[← Documentation home](/)

Measured on Node v18.18.0, Apple Silicon (ARM64). Reproduce with `npm run benchmark` in the repository.

| Scenario | 100 rules | 1,000 rules | 10,000 rules |
|---|---|---|---|
| `evaluate` (no cache) | 4.3 µs / 231k ops/s | 42.6 µs / 23k ops/s | 1,091 µs / 917 ops/s |
| `evaluate` (cache hit) | 0.6 µs / 1.66M ops/s | 1.8 µs / 553k ops/s | 29.1 µs / 34k ops/s |
| `evaluate` (all conditional) | 3.4 µs / 292k ops/s | 40.2 µs / 25k ops/s | 1,064 µs / 940 ops/s |
| `permitted` (18 actions) | 60.2 µs / 17k ops/s | 718 µs / 1.4k ops/s | 18,924 µs / 53 ops/s |
| `explain` (full trace) | 22.4 µs / 45k ops/s | 564 µs / 1.8k ops/s | 6,444 µs / 155 ops/s |

Most SaaS apps hold **10–50 rules**. At 100 rules, a single `evaluate` is ~4 µs on one core.

---

## Practical guidance

- Enable `cacheSize` for hot, unconditional paths.
- Keep rule count reasonable; split engines per domain if you reach thousands.
- Prefer `evaluate` over `permitted` with huge action lists on hot paths.
- Use `explain` in tests and debugging, not per-request in production hot paths.

→ [Evaluation cache](./evaluation-cache.md)
