/**
' * Benchmark suite for @siremzam/sentinel
 *
 * Measures evaluation latency across different rule-set sizes (100, 1k, 10k)
 * and scenarios (unconditional, conditional, cache hit, permitted(), explain()).
 *
 * Run: npm run benchmark
 */

import { AccessEngine, createPolicyFactory, RoleHierarchy } from "../src/index.js";
import type { SchemaDefinition, Subject, PolicyRule } from "../src/index.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface BenchSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "manager" | "member" | "viewer" | "auditor";
  resources: "invoice" | "project" | "report" | "user" | "org" | "billing";
  actions:
  | "invoice:create" | "invoice:read" | "invoice:approve" | "invoice:send" | "invoice:delete"
  | "project:create" | "project:read" | "project:archive" | "project:delete"
  | "report:read" | "report:export"
  | "user:read" | "user:invite" | "user:impersonate"
  | "org:read" | "org:update"
  | "billing:read" | "billing:manage";
}

const { allow, deny } = createPolicyFactory<BenchSchema>();

const ROLES: BenchSchema["roles"][] = ["owner", "admin", "manager", "member", "viewer", "auditor"];
const RESOURCES: BenchSchema["resources"][] = ["invoice", "project", "report", "user", "org", "billing"];
const ACTIONS: BenchSchema["actions"][] = [
  "invoice:create", "invoice:read", "invoice:approve", "invoice:send", "invoice:delete",
  "project:create", "project:read", "project:archive", "project:delete",
  "report:read", "report:export",
  "user:read", "user:invite", "user:impersonate",
  "org:read", "org:update",
  "billing:read", "billing:manage",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateRules(count: number): PolicyRule<BenchSchema>[] {
  const rules: PolicyRule<BenchSchema>[] = [];
  for (let i = 0; i < count; i++) {
    const effect = i % 7 === 0 ? "deny" : "allow";
    const builder = effect === "allow" ? allow() : deny();
    const role = pick(ROLES);
    const resource = pick(RESOURCES);
    const action = pick(ACTIONS.filter(a => a.startsWith(resource + ":")));
    const hasCondition = i % 5 === 0;

    let b = builder
      .id(`rule-${i}`)
      .roles(role)
      .actions(action)
      .on(resource)
      .priority(Math.floor(Math.random() * 3));

    if (hasCondition) {
      b = b.when((ctx) => ctx.subject.id !== "blocked-user");
    }

    rules.push(b.build());
  }
  return rules;
}

function makeSubject(role: BenchSchema["roles"], tenantId: string): Subject<BenchSchema> {
  return {
    id: `user-${Math.random().toString(36).slice(2, 8)}`,
    roles: [{ role, tenantId }],
  };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function p99(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.99)]!;
}

function formatUs(ms: number): string {
  return `${(ms * 1000).toFixed(1)}µs`;
}

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

interface BenchResult {
  scenario: string;
  rules: number;
  iterations: number;
  avgMs: number;
  medianMs: number;
  p99Ms: number;
  opsPerSec: number;
}

function bench(
  name: string,
  engine: AccessEngine<BenchSchema>,
  ruleCount: number,
  iterations: number,
  fn: (engine: AccessEngine<BenchSchema>) => void,
): BenchResult {
  // Warmup
  for (let i = 0; i < Math.min(100, iterations); i++) {
    fn(engine);
  }

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn(engine);
    times.push(performance.now() - start);
  }

  const total = times.reduce((a, b) => a + b, 0);
  return {
    scenario: name,
    rules: ruleCount,
    iterations,
    avgMs: total / iterations,
    medianMs: median(times),
    p99Ms: p99(times),
    opsPerSec: Math.round(iterations / (total / 1000)),
  };
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

function runSuite(ruleCount: number): BenchResult[] {
  const rules = generateRules(ruleCount);
  const iterations = ruleCount <= 100 ? 10_000 : ruleCount <= 1000 ? 5_000 : 2_000;
  const results: BenchResult[] = [];

  // Scenario 1: Simple evaluate (no cache)
  {
    const engine = new AccessEngine<BenchSchema>({ schema: {} as BenchSchema });
    engine.addRules(...rules);
    const subject = makeSubject("member", "tenant-1");
    results.push(bench("evaluate (no cache)", engine, ruleCount, iterations, (e) => {
      e.evaluate(subject, pick(ACTIONS), pick(RESOURCES), {}, "tenant-1");
    }));
  }

  // Scenario 2: Evaluate with cache
  {
    const engine = new AccessEngine<BenchSchema>({ schema: {} as BenchSchema, cacheSize: 10_000 });
    engine.addRules(...rules);
    const subject = makeSubject("admin", "tenant-1");
    // Prime cache
    for (const action of ACTIONS) {
      for (const resource of RESOURCES) {
        engine.evaluate(subject, action, resource, {}, "tenant-1");
      }
    }
    results.push(bench("evaluate (cache hit)", engine, ruleCount, iterations, (e) => {
      e.evaluate(subject, pick(ACTIONS), pick(RESOURCES), {}, "tenant-1");
    }));
  }

  // Scenario 3: Evaluate with conditions
  {
    const engine = new AccessEngine<BenchSchema>({ schema: {} as BenchSchema });
    const conditionalRules = rules.map((r, i) => ({
      ...r,
      conditions: [((ctx: { subject: { id: string } }) => ctx.subject.id !== "blocked") as any],
      id: `cond-rule-${i}`,
    }));
    engine.addRules(...conditionalRules);
    const subject = makeSubject("manager", "tenant-1");
    results.push(bench("evaluate (all conditional)", engine, ruleCount, iterations, (e) => {
      e.evaluate(subject, pick(ACTIONS), pick(RESOURCES), {}, "tenant-1");
    }));
  }

  // Scenario 4: permitted() — batch check
  {
    const engine = new AccessEngine<BenchSchema>({ schema: {} as BenchSchema });
    engine.addRules(...rules);
    const subject = makeSubject("manager", "tenant-1");
    results.push(bench("permitted (18 actions)", engine, ruleCount, Math.floor(iterations / 2), (e) => {
      e.permitted(subject, pick(RESOURCES), ACTIONS, {}, "tenant-1");
    }));
  }

  // Scenario 5: explain()
  {
    const engine = new AccessEngine<BenchSchema>({ schema: {} as BenchSchema });
    engine.addRules(...rules);
    const subject = makeSubject("member", "tenant-1");
    results.push(bench("explain", engine, ruleCount, Math.floor(iterations / 2), (e) => {
      e.explain(subject, pick(ACTIONS), pick(RESOURCES), {}, "tenant-1");
    }));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("@siremzam/sentinel — benchmark suite\n");
console.log(`Node ${process.version} | ${process.platform} ${process.arch}\n`);

const allResults: BenchResult[] = [];

for (const count of [100, 1_000, 10_000]) {
  console.log(`Running with ${count.toLocaleString()} rules...`);
  allResults.push(...runSuite(count));
}

console.log("\n" + "=".repeat(100));
console.log(
  "Scenario".padEnd(30) +
  "Rules".padStart(8) +
  "Avg".padStart(12) +
  "Median".padStart(12) +
  "p99".padStart(12) +
  "ops/sec".padStart(14),
);
console.log("=".repeat(100));

for (const r of allResults) {
  console.log(
    r.scenario.padEnd(30) +
    r.rules.toLocaleString().padStart(8) +
    formatUs(r.avgMs).padStart(12) +
    formatUs(r.medianMs).padStart(12) +
    formatUs(r.p99Ms).padStart(12) +
    r.opsPerSec.toLocaleString().padStart(14),
  );
}

console.log("=".repeat(100));
