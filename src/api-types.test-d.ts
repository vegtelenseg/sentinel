import { AccessEngine, createPolicyFactory, RoleHierarchy } from "./index.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface AppSchema extends SchemaDefinition {
  roles: "admin" | "member";
  resources: "invoice";
  actions: "invoice:approve" | "invoice:read";
}

const { allow, deny } = createPolicyFactory<AppSchema>();
const schema = {} as AppSchema;

const subject: Subject<AppSchema> = {
  id: "u1",
  roles: [{ role: "admin", tenantId: "acme" }],
};

allow().roles("admin", "member").actions("invoice:approve", "invoice:read").on("invoice").build();
deny().anyRole().anyAction().anyResource().build();
allow().actions("invoice:*").on("invoice").build();
allow().actions("*:read").on("invoice").build();
allow().actions("invoice:*" as AppSchema["actions"]).on("invoice").build();
deny().actions("invoice:*").on("invoice").build();

const engine = new AccessEngine<AppSchema>({
  schema,
  cacheSize: 100,
  defaultEffect: "deny",
});

engine.allow().actions("invoice:*").on("invoice").build();

// @ts-expect-error unknown role is not in the schema union
allow().roles("nope");

// @ts-expect-error not a schema action or resource:* / *:verb wildcard
allow().actions("not-a-pattern");

engine.evaluate(subject, "invoice:approve", "invoice", {}, "acme");
engine.can(subject).perform("invoice:read").on("invoice");

// @ts-expect-error evaluate takes a concrete action, not a rule-side wildcard
engine.evaluate(subject, "invoice:*", "invoice");

// @ts-expect-error explain takes a concrete action, not a rule-side wildcard
engine.explain(subject, "invoice:*", "invoice");

// @ts-expect-error permitted lists concrete actions, not wildcards
engine.permitted(subject, "invoice", ["invoice:*"]);

// @ts-expect-error fluent check takes a concrete action
engine.can(subject).perform("invoice:*");

new AccessEngine<AppSchema>({
  schema,
  // @ts-expect-error 1.0 option is cacheSize, not evaluationCache
  evaluationCache: { maxSize: 10 },
});

const hierarchy = new RoleHierarchy<AppSchema>().define("admin", ["member"]);
hierarchy.resolve("admin");

// @ts-expect-error 1.0 method is define(role, inheritsFrom[]), not add()
hierarchy.add("admin", "member");
