export { AccessEngine } from "./engine.js";
export type { AccessEngineOptions } from "./engine.js";
export { RuleBuilder, allow, deny, createPolicyFactory } from "./policy-builder.js";
export { RoleHierarchy } from "./role-hierarchy.js";
export {
  ConditionRegistry,
  exportRules,
  exportRulesToJson,
  importRules,
  importRulesFromJson,
} from "./serialization.js";

export { toAuditEntry } from "./types.js";

export type {
  SchemaDefinition,
  ActionString,
  InferRole,
  InferResource,
  InferAction,
  InferTenantId,
  RoleAssignment,
  Subject,
  ResourceContext,
  EvaluationContext,
  Condition,
  PolicyEffect,
  PolicyRule,
  Decision,
  AuditEntry,
  DecisionListener,
  ConditionError,
  ConditionErrorHandler,
  EngineOptions,
  ExplainResult,
  RuleEvaluation,
  ConditionResult,
} from "./types.js";

export type {
  JsonPolicyRule,
  JsonPolicyDocument,
} from "./serialization.js";

export type { ServerOptions, EvalRequestBody } from "./server.js";
