import { describe, it, expect } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow } from "./policy-builder.js";
import { RoleHierarchy } from "./role-hierarchy.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "manager" | "member" | "viewer";
  resources: "invoice" | "project" | "report";
  actions:
    | "invoice:create"
    | "invoice:read"
    | "invoice:approve"
    | "project:read"
    | "project:archive"
    | "report:read";
}

const schema: TestSchema = {} as TestSchema;

describe("RoleHierarchy", () => {
  it("resolves direct role (no inheritance)", () => {
    const hierarchy = new RoleHierarchy<TestSchema>();
    const resolved = hierarchy.resolve("viewer");
    expect(resolved).toEqual(new Set(["viewer"]));
  });

  it("resolves single-level inheritance", () => {
    const hierarchy = new RoleHierarchy<TestSchema>()
      .define("admin", ["manager"]);

    expect(hierarchy.resolve("admin")).toEqual(new Set(["admin", "manager"]));
    expect(hierarchy.resolve("manager")).toEqual(new Set(["manager"]));
  });

  it("resolves multi-level inheritance", () => {
    const hierarchy = new RoleHierarchy<TestSchema>()
      .define("owner", ["admin"])
      .define("admin", ["manager"])
      .define("manager", ["member"])
      .define("member", ["viewer"]);

    expect(hierarchy.resolve("owner")).toEqual(
      new Set(["owner", "admin", "manager", "member", "viewer"]),
    );
    expect(hierarchy.resolve("admin")).toEqual(
      new Set(["admin", "manager", "member", "viewer"]),
    );
    expect(hierarchy.resolve("manager")).toEqual(
      new Set(["manager", "member", "viewer"]),
    );
    expect(hierarchy.resolve("member")).toEqual(new Set(["member", "viewer"]));
    expect(hierarchy.resolve("viewer")).toEqual(new Set(["viewer"]));
  });

  it("resolves diamond inheritance", () => {
    const hierarchy = new RoleHierarchy<TestSchema>()
      .define("admin", ["manager", "viewer"])
      .define("manager", ["viewer"]);

    const resolved = hierarchy.resolve("admin");
    expect(resolved).toEqual(new Set(["admin", "manager", "viewer"]));
  });

  it("detects cycles", () => {
    const hierarchy = new RoleHierarchy<TestSchema>();
    hierarchy.define("admin", ["manager"]);
    expect(() => hierarchy.define("manager", ["admin"])).toThrow("Cycle detected");
  });

  it("resolveAll merges multiple roles", () => {
    const hierarchy = new RoleHierarchy<TestSchema>()
      .define("admin", ["member"])
      .define("manager", ["viewer"]);

    const resolved = hierarchy.resolveAll(["admin", "manager"]);
    expect(resolved).toEqual(new Set(["admin", "member", "manager", "viewer"]));
  });

  it("lists defined roles", () => {
    const hierarchy = new RoleHierarchy<TestSchema>()
      .define("admin", ["manager"])
      .define("manager", ["viewer"]);

    expect(hierarchy.definedRoles()).toEqual(["admin", "manager"]);
  });
});

describe("Engine with RoleHierarchy", () => {
  it("admin inherits member permissions", () => {
    const hierarchy = new RoleHierarchy<TestSchema>()
      .define("owner", ["admin"])
      .define("admin", ["manager"])
      .define("manager", ["member"])
      .define("member", ["viewer"]);

    const engine = new AccessEngine<TestSchema>({
      schema,
      roleHierarchy: hierarchy,
    });

    engine.addRules(
      allow<TestSchema>()
        .id("viewer-read")
        .roles("viewer")
        .actions("invoice:read", "project:read", "report:read")
        .anyResource()
        .build(),
      allow<TestSchema>()
        .id("member-create")
        .roles("member")
        .actions("invoice:create")
        .on("invoice")
        .build(),
      allow<TestSchema>()
        .id("manager-approve")
        .roles("manager")
        .actions("invoice:approve")
        .on("invoice")
        .build(),
      allow<TestSchema>()
        .id("admin-archive")
        .roles("admin")
        .actions("project:archive")
        .on("project")
        .build(),
    );

    const admin: Subject<TestSchema> = { id: "u1", roles: [{ role: "admin" }] };

    expect(engine.evaluate(admin, "invoice:read", "invoice").allowed).toBe(true);
    expect(engine.evaluate(admin, "invoice:create", "invoice").allowed).toBe(true);
    expect(engine.evaluate(admin, "invoice:approve", "invoice").allowed).toBe(true);
    expect(engine.evaluate(admin, "project:archive", "project").allowed).toBe(true);

    const member: Subject<TestSchema> = { id: "u2", roles: [{ role: "member" }] };
    expect(engine.evaluate(member, "invoice:read", "invoice").allowed).toBe(true);
    expect(engine.evaluate(member, "invoice:create", "invoice").allowed).toBe(true);
    expect(engine.evaluate(member, "invoice:approve", "invoice").allowed).toBe(false);
    expect(engine.evaluate(member, "project:archive", "project").allowed).toBe(false);

    const viewer: Subject<TestSchema> = { id: "u3", roles: [{ role: "viewer" }] };
    expect(engine.evaluate(viewer, "invoice:read", "invoice").allowed).toBe(true);
    expect(engine.evaluate(viewer, "invoice:create", "invoice").allowed).toBe(false);
  });

  it("owner inherits everything through the chain", () => {
    const hierarchy = new RoleHierarchy<TestSchema>()
      .define("owner", ["admin"])
      .define("admin", ["manager"])
      .define("manager", ["member"])
      .define("member", ["viewer"]);

    const engine = new AccessEngine<TestSchema>({
      schema,
      roleHierarchy: hierarchy,
    });

    engine.addRules(
      allow<TestSchema>().id("viewer-read").roles("viewer").actions("report:read").on("report").build(),
      allow<TestSchema>().id("admin-archive").roles("admin").actions("project:archive").on("project").build(),
    );

    const owner: Subject<TestSchema> = { id: "u1", roles: [{ role: "owner" }] };
    expect(engine.evaluate(owner, "report:read", "report").allowed).toBe(true);
    expect(engine.evaluate(owner, "project:archive", "project").allowed).toBe(true);
  });
});
