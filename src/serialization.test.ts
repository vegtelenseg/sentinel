import { describe, it, expect } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow, deny } from "./policy-builder.js";
import {
  ConditionRegistry,
  exportRules,
  exportRulesToJson,
  importRules,
  importRulesFromJson,
} from "./serialization.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "member" | "viewer";
  resources: "invoice" | "project";
  actions: "invoice:create" | "invoice:read" | "invoice:update" | "project:read";
}

const schema: TestSchema = {} as TestSchema;

describe("JSON Serialization", () => {
  it("exports rules to a JSON document", () => {
    const rules = [
      allow<TestSchema>()
        .id("admin-all")
        .roles("admin")
        .anyAction()
        .anyResource()
        .priority(10)
        .describe("Admins can do anything")
        .build(),
      deny<TestSchema>()
        .id("no-create-viewer")
        .roles("viewer")
        .actions("invoice:create")
        .on("invoice")
        .build(),
    ];

    const doc = exportRules(rules);
    expect(doc.version).toBe(1);
    expect(doc.rules).toHaveLength(2);
    expect(doc.rules[0]!.id).toBe("admin-all");
    expect(doc.rules[0]!.effect).toBe("allow");
    expect(doc.rules[0]!.roles).toEqual(["admin"]);
    expect(doc.rules[0]!.actions).toBe("*");
    expect(doc.rules[0]!.resources).toBe("*");
    expect(doc.rules[0]!.priority).toBe(10);
    expect(doc.rules[0]!.description).toBe("Admins can do anything");
    expect(doc.rules[1]!.effect).toBe("deny");
  });

  it("exports rules to a JSON string", () => {
    const rules = [
      allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
    ];
    const json = exportRulesToJson(rules);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.rules).toHaveLength(1);
  });

  it("exports condition names when a reverse map is provided", () => {
    const isOwner = (ctx: { subject: { id: string }; resourceContext: Record<string, unknown> }) =>
      ctx.subject.id === ctx.resourceContext["ownerId"];

    const rule = allow<TestSchema>()
      .id("owner-update")
      .roles("member")
      .actions("invoice:update")
      .on("invoice")
      .when(isOwner)
      .build();

    const conditionNames = new Map<Function, string>();
    conditionNames.set(isOwner, "isOwner");

    const doc = exportRules([rule], conditionNames as never);
    expect(doc.rules[0]!.conditions).toEqual(["isOwner"]);
  });

  it("imports rules from a JSON document", () => {
    const doc = {
      version: 1 as const,
      rules: [
        {
          id: "admin-all",
          effect: "allow" as const,
          roles: ["admin"],
          actions: "*" as const,
          resources: "*" as const,
          priority: 5,
          description: "Full admin access",
        },
      ],
    };

    const rules = importRules<TestSchema>(doc);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.id).toBe("admin-all");
    expect(rules[0]!.effect).toBe("allow");
    expect(rules[0]!.roles).toEqual(["admin"]);
    expect(rules[0]!.actions).toBe("*");
    expect(rules[0]!.priority).toBe(5);
  });

  it("imports rules with conditions resolved from a registry", () => {
    const registry = new ConditionRegistry<TestSchema>();
    registry.register("isOwner", (ctx) => ctx.subject.id === ctx.resourceContext["ownerId"]);

    const doc = {
      version: 1 as const,
      rules: [
        {
          id: "owner-update",
          effect: "allow" as const,
          roles: ["member"],
          actions: ["invoice:update"],
          resources: ["invoice"],
          conditions: ["isOwner"],
        },
      ],
    };

    const rules = importRules(doc, registry);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.conditions).toHaveLength(1);

    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(...rules);

    const user: Subject<TestSchema> = { id: "u1", roles: [{ role: "member" }] };
    expect(engine.evaluate(user, "invoice:update", "invoice", { ownerId: "u1" }).allowed).toBe(true);
    expect(engine.evaluate(user, "invoice:update", "invoice", { ownerId: "u99" }).allowed).toBe(false);
  });

  it("throws on unknown condition names", () => {
    const registry = new ConditionRegistry<TestSchema>();
    const doc = {
      version: 1 as const,
      rules: [
        {
          id: "r1",
          effect: "allow" as const,
          roles: "*" as const,
          actions: "*" as const,
          resources: "*" as const,
          conditions: ["nonExistent"],
        },
      ],
    };

    expect(() => importRules(doc, registry)).toThrow('Unknown condition "nonExistent"');
  });

  it("round-trips: export → parse → import → evaluate", () => {
    const original = [
      allow<TestSchema>()
        .id("admin-all")
        .roles("admin")
        .anyAction()
        .anyResource()
        .priority(10)
        .describe("Full admin")
        .build(),
      deny<TestSchema>()
        .id("deny-create")
        .roles("viewer")
        .actions("invoice:create")
        .on("invoice")
        .build(),
    ];

    const json = exportRulesToJson(original);
    const imported = importRulesFromJson<TestSchema>(json);

    const engine = new AccessEngine<TestSchema>({ schema });
    engine.addRules(...imported);

    const admin: Subject<TestSchema> = { id: "u1", roles: [{ role: "admin" }] };
    expect(engine.evaluate(admin, "invoice:create", "invoice").allowed).toBe(true);

    const viewer: Subject<TestSchema> = { id: "u2", roles: [{ role: "viewer" }] };
    expect(engine.evaluate(viewer, "invoice:create", "invoice").allowed).toBe(false);
  });

  it("rejects unsupported document versions", () => {
    const doc = { version: 99, rules: [] };
    expect(() => importRules(doc as never)).toThrow("Unsupported policy document version: 99");
  });
});

describe("ConditionRegistry", () => {
  it("registers, retrieves, and lists conditions", () => {
    const registry = new ConditionRegistry<TestSchema>();
    registry.register("isOwner", () => true);
    registry.register("isActive", () => false);

    expect(registry.has("isOwner")).toBe(true);
    expect(registry.has("unknown")).toBe(false);
    expect(registry.get("isOwner")).toBeDefined();
    expect(registry.names()).toEqual(["isOwner", "isActive"]);
  });
});
