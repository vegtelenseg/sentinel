import { describe, it, expect, vi } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow, deny } from "./policy-builder.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "manager" | "member" | "viewer";
  resources: "invoice" | "project" | "report";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:update"
    | "invoice:approve"
    | "invoice:send"
    | "project:read"
    | "project:archive"
    | "report:read"
    | "report:export";
}

const schema: TestSchema = {} as TestSchema;

function makeUser(
  id: string,
  roles: { role: TestSchema["roles"]; tenantId?: string }[],
): Subject<TestSchema> {
  return { id, roles };
}

// ---------------------------------------------------------------------------
// Wildcard action patterns
// ---------------------------------------------------------------------------

describe("Wildcard action patterns", () => {
  it("invoice:* matches all invoice actions", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("manager-all-invoice")
        .roles("manager")
        .actions("invoice:*" as TestSchema["actions"])
        .on("invoice")
        .build(),
    );

    const manager = makeUser("u1", [{ role: "manager" }]);
    expect(engine.evaluate(manager, "invoice:create", "invoice").allowed).toBe(true);
    expect(engine.evaluate(manager, "invoice:read", "invoice").allowed).toBe(true);
    expect(engine.evaluate(manager, "invoice:update", "invoice").allowed).toBe(true);
    expect(engine.evaluate(manager, "invoice:approve", "invoice").allowed).toBe(true);
    expect(engine.evaluate(manager, "invoice:send", "invoice").allowed).toBe(true);

    expect(engine.evaluate(manager, "project:read", "project").allowed).toBe(false);
    expect(engine.evaluate(manager, "report:read", "report").allowed).toBe(false);
  });

  it("*:read matches read action on any resource prefix", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRule(
      allow<TestSchema>()
        .id("viewer-all-reads")
        .roles("viewer")
        .actions("*:read" as TestSchema["actions"])
        .anyResource()
        .build(),
    );

    const viewer = makeUser("u1", [{ role: "viewer" }]);
    expect(engine.evaluate(viewer, "invoice:read", "invoice").allowed).toBe(true);
    expect(engine.evaluate(viewer, "project:read", "project").allowed).toBe(true);
    expect(engine.evaluate(viewer, "report:read", "report").allowed).toBe(true);
    expect(engine.evaluate(viewer, "invoice:create", "invoice").allowed).toBe(false);
  });

  it("exact match still works alongside wildcards", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(
      allow<TestSchema>()
        .id("wildcard")
        .roles("manager")
        .actions("invoice:*" as TestSchema["actions"])
        .on("invoice")
        .build(),
      deny<TestSchema>()
        .id("deny-approve")
        .roles("manager")
        .actions("invoice:approve")
        .on("invoice")
        .priority(1)
        .build(),
    );

    const manager = makeUser("u1", [{ role: "manager" }]);
    expect(engine.evaluate(manager, "invoice:read", "invoice").allowed).toBe(true);
    expect(engine.evaluate(manager, "invoice:approve", "invoice").allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

describe("Evaluation caching", () => {
  it("returns cached result on repeated evaluations", () => {
    const spy = vi.fn();
    const engine = new AccessEngine<TestSchema>({
      schema,
      cacheSize: 100,
      onDecision: spy,
    });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);

    const d1 = engine.evaluate(admin, "invoice:read", "invoice");
    const d2 = engine.evaluate(admin, "invoice:read", "invoice");

    expect(d1.allowed).toBe(true);
    expect(d2.allowed).toBe(true);
    expect(d1).toBe(d2);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("different actions produce different cache entries", () => {
    const engine = new AccessEngine<TestSchema>({ schema, cacheSize: 100 });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").actions("invoice:read").on("invoice").build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    const d1 = engine.evaluate(admin, "invoice:read", "invoice");
    const d2 = engine.evaluate(admin, "invoice:create", "invoice");
    expect(d1.allowed).toBe(true);
    expect(d2.allowed).toBe(false);
  });

  it("cache is cleared when rules change", () => {
    const engine = new AccessEngine<TestSchema>({ schema, cacheSize: 100 });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    engine.evaluate(admin, "invoice:read", "invoice");
    expect(engine.cacheStats!.size).toBe(1);

    engine.addRule(
      deny<TestSchema>().id("r2").roles("admin").actions("invoice:read").on("invoice").build(),
    );
    expect(engine.cacheStats!.size).toBe(0);
  });

  it("clearCache explicitly empties the cache", () => {
    const engine = new AccessEngine<TestSchema>({ schema, cacheSize: 100 });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    engine.evaluate(admin, "invoice:read", "invoice");
    expect(engine.cacheStats!.size).toBe(1);

    engine.clearCache();
    expect(engine.cacheStats!.size).toBe(0);
  });

  it("LRU evicts oldest entries when capacity is reached", () => {
    const engine = new AccessEngine<TestSchema>({ schema, cacheSize: 2 });
    engine.addRule(
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    );

    const admin = makeUser("u1", [{ role: "admin" }]);
    engine.evaluate(admin, "invoice:read", "invoice");
    engine.evaluate(admin, "invoice:create", "invoice");
    expect(engine.cacheStats!.size).toBe(2);

    engine.evaluate(admin, "project:read", "project");
    expect(engine.cacheStats!.size).toBe(2);
    expect(engine.cacheStats!.maxSize).toBe(2);
  });

  it("cacheStats returns null when caching is disabled", () => {
    const engine = new AccessEngine<TestSchema>({ schema });
    expect(engine.cacheStats).toBeNull();
  });
});
