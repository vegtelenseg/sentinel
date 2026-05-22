/**
 * Core type definitions for the authorization engine.
 *
 * The type system is designed so that defining a schema once
 * propagates full autocomplete through every API surface:
 * policies, checks, audits, and middleware.
 */

// ---------------------------------------------------------------------------
// Schema definition types — what users provide to configure the engine
// ---------------------------------------------------------------------------

export type ActionString = `${string}:${string}`;

export interface SchemaDefinition {
  roles: string;
  resources: string;
  actions: ActionString;
  tenantId?: string;
}

/**
 * Infer concrete union types from a schema definition.
 * Used internally to thread type narrowing everywhere.
 */
export type InferRole<S extends SchemaDefinition> = S["roles"];
export type InferResource<S extends SchemaDefinition> = S["resources"];
export type InferAction<S extends SchemaDefinition> = S["actions"];
export type InferTenantId<S extends SchemaDefinition> = S["tenantId"] extends string
  ? S["tenantId"]
  : string;

// ---------------------------------------------------------------------------
// User / Subject
// ---------------------------------------------------------------------------

export interface RoleAssignment<S extends SchemaDefinition> {
  role: InferRole<S>;
  tenantId?: InferTenantId<S>;
}

export interface Subject<S extends SchemaDefinition> {
  id: string;
  roles: RoleAssignment<S>[];
  attributes?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Resource context passed during evaluation
// ---------------------------------------------------------------------------

export interface ResourceContext {
  id?: string;
  tenantId?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Evaluation context — what conditions receive
// ---------------------------------------------------------------------------

export interface EvaluationContext<S extends SchemaDefinition> {
  subject: Subject<S>;
  action: InferAction<S>;
  resource: InferResource<S>;
  resourceContext: ResourceContext;
  tenantId?: string;
  environment?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Condition — a predicate attached to a policy rule
// ---------------------------------------------------------------------------

export type Condition<S extends SchemaDefinition> = (
  ctx: EvaluationContext<S>,
) => boolean | Promise<boolean>;

// ---------------------------------------------------------------------------
// Policy rule — the atomic unit of authorization
// ---------------------------------------------------------------------------

export type PolicyEffect = "allow" | "deny";

export interface PolicyRule<S extends SchemaDefinition> {
  readonly id: string;
  readonly effect: PolicyEffect;
  readonly roles: InferRole<S>[] | "*";
  readonly actions: InferAction<S>[] | "*";
  readonly resources: InferResource<S>[] | "*";
  readonly conditions?: Condition<S>[];
  /**
   * Higher priority wins. Deny at equal priority wins over allow.
   * Default: 0
   */
  readonly priority?: number;
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// Decision — the result of evaluating a request
// ---------------------------------------------------------------------------

export interface Decision<S extends SchemaDefinition> {
  allowed: boolean;
  effect: PolicyEffect | "default-deny";
  matchedRule: PolicyRule<S> | null;
  subject: Subject<S>;
  action: InferAction<S>;
  resource: InferResource<S>;
  resourceContext: ResourceContext;
  tenantId?: string;
  timestamp: number;
  durationMs: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Audit entry — serialization-safe version of Decision
// ---------------------------------------------------------------------------

export interface AuditEntry {
  allowed: boolean;
  effect: string;
  matchedRuleId: string | null;
  matchedRuleDescription: string | null;
  subjectId: string;
  action: string;
  resource: string;
  tenantId?: string;
  timestamp: number;
  durationMs: number;
  reason: string;
}

/**
 * Convert a Decision to a serialization-safe AuditEntry
 * (strips functions, large objects, and condition references).
 */
export function toAuditEntry<S extends SchemaDefinition>(decision: Decision<S>): AuditEntry {
  return {
    allowed: decision.allowed,
    effect: decision.effect,
    matchedRuleId: decision.matchedRule?.id ?? null,
    matchedRuleDescription: decision.matchedRule?.description ?? null,
    subjectId: decision.subject.id,
    action: decision.action as string,
    resource: decision.resource as string,
    tenantId: decision.tenantId,
    timestamp: decision.timestamp,
    durationMs: decision.durationMs,
    reason: decision.reason,
  };
}

// ---------------------------------------------------------------------------
// Explain result — detailed evaluation trace for debugging
// ---------------------------------------------------------------------------

export interface ConditionResult {
  index: number;
  passed: boolean;
  error?: string;
}

export interface RuleEvaluation<S extends SchemaDefinition> {
  rule: PolicyRule<S>;
  roleMatched: boolean;
  actionMatched: boolean;
  resourceMatched: boolean;
  conditionResults: ConditionResult[];
  matched: boolean;
}

export interface ExplainResult<S extends SchemaDefinition> {
  allowed: boolean;
  effect: PolicyEffect | "default-deny";
  reason: string;
  evaluatedRules: RuleEvaluation<S>[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Audit / Observability
// ---------------------------------------------------------------------------

export type DecisionListener<S extends SchemaDefinition> = (
  decision: Decision<S>,
) => void | Promise<void>;

export interface ConditionError {
  ruleId: string;
  conditionIndex: number;
  error: unknown;
}

export type ConditionErrorHandler = (err: ConditionError) => void;

// ---------------------------------------------------------------------------
// Engine options
// ---------------------------------------------------------------------------

export interface EngineOptions<S extends SchemaDefinition> {
  schema: S;
  defaultEffect?: PolicyEffect;
  onDecision?: DecisionListener<S>;
  onConditionError?: ConditionErrorHandler;
  /**
   * When true, evaluate() throws if tenantId is omitted and the subject
   * has any tenant-scoped role assignments. Prevents accidental
   * cross-tenant privilege escalation.
   */
  strictTenancy?: boolean;
}
