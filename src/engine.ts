import type {
  SchemaDefinition,
  InferAction,
  InferResource,
  InferRole,
  PolicyRule,
  Decision,
  Subject,
  ResourceContext,
  EvaluationContext,
  DecisionListener,
  EngineOptions,
  ConditionErrorHandler,
  ExplainResult,
  RuleEvaluation,
  ConditionResult,
} from "./types.js";
import type { RuleBuilder } from "./policy-builder.js";
import { allow as _allow, deny as _deny } from "./policy-builder.js";
import type { RoleHierarchy } from "./role-hierarchy.js";

// ---------------------------------------------------------------------------
// Compiled rule — internal representation with pre-compiled regex
// ---------------------------------------------------------------------------

interface CompiledRule<S extends SchemaDefinition> {
  rule: PolicyRule<S>;
  actionPatterns: RegExp[] | null;
}

function escapeRegexMeta(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

const ASYNC_CONDITION_EVALUATE_MSG =
  "Async condition encountered. Use evaluateAsync() instead.";
const ASYNC_CONDITION_EXPLAIN_MSG =
  "Async condition encountered. Use explainAsync() instead.";

function compileActionPatterns(actions: string[] | "*"): RegExp[] | null {
  if (actions === "*") return null;
  const patterns: RegExp[] = [];
  for (const action of actions) {
    if (action.includes("*")) {
      const escaped = escapeRegexMeta(action).replace(/\*/g, "[^:]*");
      patterns.push(new RegExp("^" + escaped + "$"));
    }
  }
  return patterns.length > 0 ? patterns : null;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface AccessEngineOptions<S extends SchemaDefinition> extends EngineOptions<S> {
  roleHierarchy?: RoleHierarchy<S>;
  /**
   * Enable LRU cache for evaluation results.
   * Only caches evaluations of rules WITHOUT conditions (context-independent).
   * Rules with conditions are never cached since their result depends on resourceContext.
   */
  cacheSize?: number;
}

export class AccessEngine<S extends SchemaDefinition> {
  private compiled: CompiledRule<S>[] = [];
  private listeners: DecisionListener<S>[] = [];
  private _defaultDeny: boolean;
  private _strictTenancy: boolean;
  private hierarchy?: RoleHierarchy<S>;
  private cache?: LRUCache<Decision<S>>;
  private conditionErrorHandler?: ConditionErrorHandler;

  constructor(options: AccessEngineOptions<S>) {
    this._defaultDeny = (options.defaultEffect ?? "deny") === "deny";
    this._strictTenancy = options.strictTenancy ?? false;
    this.hierarchy = options.roleHierarchy;
    this.conditionErrorHandler = options.onConditionError;
    if (options.cacheSize && options.cacheSize > 0) {
      this.cache = new LRUCache(options.cacheSize);
    }
    if (options.onDecision) {
      this.listeners.push(options.onDecision);
    }
  }

  // -----------------------------------------------------------------------
  // Rule management
  // -----------------------------------------------------------------------

  addRule(rule: PolicyRule<S>): this {
    const frozen = Object.freeze({ ...rule });
    this.compiled.push({
      rule: frozen,
      actionPatterns: compileActionPatterns(frozen.actions as string[] | "*"),
    });
    this.cache?.clear();
    return this;
  }

  addRules(...rules: PolicyRule<S>[]): this {
    for (const rule of rules) {
      const frozen = Object.freeze({ ...rule });
      this.compiled.push({
        rule: frozen,
        actionPatterns: compileActionPatterns(frozen.actions as string[] | "*"),
      });
    }
    this.cache?.clear();
    return this;
  }

  removeRule(ruleId: string): boolean {
    const idx = this.compiled.findIndex((c) => c.rule.id === ruleId);
    if (idx === -1) return false;
    this.compiled.splice(idx, 1);
    this.cache?.clear();
    return true;
  }

  getRules(): ReadonlyArray<PolicyRule<S>> {
    return this.compiled.map((c) => c.rule);
  }

  clearRules(): void {
    this.compiled = [];
    this.cache?.clear();
  }

  // -----------------------------------------------------------------------
  // Cache control
  // -----------------------------------------------------------------------

  clearCache(): void {
    this.cache?.clear();
  }

  get cacheStats(): { size: number; maxSize: number } | null {
    if (!this.cache) return null;
    return { size: this.cache.size, maxSize: this.cache.maxSize };
  }

  // -----------------------------------------------------------------------
  // Fluent rule builders bound to this engine's schema
  // -----------------------------------------------------------------------

  allow(): RuleBuilder<S> {
    return _allow<S>();
  }

  deny(): RuleBuilder<S> {
    return _deny<S>();
  }

  // -----------------------------------------------------------------------
  // Observability
  // -----------------------------------------------------------------------

  onDecision(listener: DecisionListener<S>): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  private emit(decision: Decision<S>): void {
    for (const listener of this.listeners) {
      try {
        const result = listener(decision);
        if (result instanceof Promise) {
          result.catch(() => {});
        }
      } catch {
        // listeners must not break evaluation
      }
    }
  }

  // -----------------------------------------------------------------------
  // Evaluation
  // -----------------------------------------------------------------------

  evaluate(
    subject: Subject<S>,
    action: InferAction<S>,
    resource: InferResource<S>,
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): Decision<S> {
    this.validateInput(subject, action, resource);
    this.enforceTenancy(subject, tenantId);

    const cacheKey = this.cache
      ? buildCacheKey(subject.id, action as string, resource as string, tenantId)
      : undefined;
    if (cacheKey) {
      const cached = this.cache!.get(cacheKey);
      if (cached) {
        this.emit(cached);
        return cached;
      }
    }

    const start = performance.now();
    const ctx = this.buildContext(subject, action, resource, resourceContext, tenantId);
    const candidates = this.matchRules(subject, action, resource, tenantId);

    let matched: CompiledRule<S> | null = null;
    let matchedHasConditions = false;

    for (const compiled of candidates) {
      const { rule } = compiled;
      if (!rule.conditions || rule.conditions.length === 0) {
        matched = compiled;
        matchedHasConditions = false;
        break;
      }
      const allMet = this.evaluateConditionsSync(rule, ctx);
      if (allMet) {
        matched = compiled;
        matchedHasConditions = true;
        break;
      }
    }

    const decision = this.buildDecision(matched?.rule ?? null, ctx, start);

    if (cacheKey && !matchedHasConditions) {
      this.cache!.set(cacheKey, decision);
    }

    this.emit(decision);
    return decision;
  }

  async evaluateAsync(
    subject: Subject<S>,
    action: InferAction<S>,
    resource: InferResource<S>,
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): Promise<Decision<S>> {
    this.validateInput(subject, action, resource);
    this.enforceTenancy(subject, tenantId);
    const start = performance.now();
    const ctx = this.buildContext(subject, action, resource, resourceContext, tenantId);
    const candidates = this.matchRules(subject, action, resource, tenantId);

    let matched: PolicyRule<S> | null = null;

    for (const compiled of candidates) {
      const { rule } = compiled;
      if (!rule.conditions || rule.conditions.length === 0) {
        matched = rule;
        break;
      }
      const results = await Promise.all(
        rule.conditions.map((c, i) =>
          Promise.resolve()
            .then(() => c(ctx))
            .catch((err) => {
              this.emitConditionError(rule.id, i, err);
              return false;
            }),
        ),
      );
      if (results.every(Boolean)) {
        matched = rule;
        break;
      }
    }

    const decision = this.buildDecision(matched, ctx, start);
    this.emit(decision);
    return decision;
  }

  // -----------------------------------------------------------------------
  // permitted() — list allowed actions on a resource for UI rendering
  // -----------------------------------------------------------------------

  permitted(
    subject: Subject<S>,
    resource: InferResource<S>,
    actions: InferAction<S>[],
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): Set<InferAction<S>> {
    const allowed = new Set<InferAction<S>>();
    for (const action of actions) {
      const decision = this.evaluate(subject, action, resource, resourceContext, tenantId);
      if (decision.allowed) {
        allowed.add(action);
      }
    }
    return allowed;
  }

  async permittedAsync(
    subject: Subject<S>,
    resource: InferResource<S>,
    actions: InferAction<S>[],
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): Promise<Set<InferAction<S>>> {
    const allowed = new Set<InferAction<S>>();
    const results = await Promise.all(
      actions.map((action) =>
        this.evaluateAsync(subject, action, resource, resourceContext, tenantId),
      ),
    );
    for (let i = 0; i < actions.length; i++) {
      if (results[i]!.allowed) {
        allowed.add(actions[i]!);
      }
    }
    return allowed;
  }

  // -----------------------------------------------------------------------
  // explain() — full evaluation trace for debugging
  // -----------------------------------------------------------------------

  explain(
    subject: Subject<S>,
    action: InferAction<S>,
    resource: InferResource<S>,
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): ExplainResult<S> {
    this.enforceTenancy(subject, tenantId);
    const start = performance.now();
    const ctx = this.buildContext(subject, action, resource, resourceContext, tenantId);
    const subjectRoles = this.resolveRoles(subject, tenantId);

    const evaluatedRules: RuleEvaluation<S>[] = [];
    let firstMatch: PolicyRule<S> | null = null;

    const sorted = this.sortCandidates([...this.compiled]);

    for (const compiled of sorted) {
      const { rule } = compiled;
      const roleMatched = rule.roles === "*" || rule.roles.some((r) => subjectRoles.has(r));
      const actionMatched = rule.actions === "*" || this.matchesAction(compiled, action);
      const resourceMatched = rule.resources === "*" || rule.resources.includes(resource);

      const conditionResults: ConditionResult[] = [];
      let allConditionsPassed = true;

      if (roleMatched && actionMatched && resourceMatched && rule.conditions) {
        for (let i = 0; i < rule.conditions.length; i++) {
          try {
            const result = rule.conditions[i]!(ctx);
            if (isThenable(result)) {
              throw new Error(ASYNC_CONDITION_EXPLAIN_MSG);
            }
            if (result !== true) {
              conditionResults.push({ index: i, passed: false });
              allConditionsPassed = false;
            } else {
              conditionResults.push({ index: i, passed: true });
            }
          } catch (err) {
            if (
              err instanceof Error &&
              err.message === ASYNC_CONDITION_EXPLAIN_MSG
            ) {
              throw err;
            }
            conditionResults.push({
              index: i,
              passed: false,
              error: err instanceof Error ? err.message : String(err),
            });
            allConditionsPassed = false;
          }
        }
      }

      const matched =
        roleMatched && actionMatched && resourceMatched &&
        (!rule.conditions || rule.conditions.length === 0 || allConditionsPassed);

      evaluatedRules.push({
        rule,
        roleMatched,
        actionMatched,
        resourceMatched,
        conditionResults,
        matched,
      });

      if (matched && !firstMatch) {
        firstMatch = rule;
      }
    }

    const allowed = firstMatch != null ? firstMatch.effect === "allow" : !this._defaultDeny;
    const effect = firstMatch?.effect ?? "default-deny";
    const reason = firstMatch
      ? `Matched rule "${firstMatch.id}"${firstMatch.description ? `: ${firstMatch.description}` : ""}`
      : "No matching rule — default deny";

    return {
      allowed,
      effect,
      reason,
      evaluatedRules,
      durationMs: performance.now() - start,
    };
  }

  async explainAsync(
    subject: Subject<S>,
    action: InferAction<S>,
    resource: InferResource<S>,
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): Promise<ExplainResult<S>> {
    this.enforceTenancy(subject, tenantId);
    const start = performance.now();
    const ctx = this.buildContext(subject, action, resource, resourceContext, tenantId);
    const subjectRoles = this.resolveRoles(subject, tenantId);

    const evaluatedRules: RuleEvaluation<S>[] = [];
    let firstMatch: PolicyRule<S> | null = null;

    const sorted = this.sortCandidates([...this.compiled]);

    for (const compiled of sorted) {
      const { rule } = compiled;
      const roleMatched = rule.roles === "*" || rule.roles.some((r) => subjectRoles.has(r));
      const actionMatched = rule.actions === "*" || this.matchesAction(compiled, action);
      const resourceMatched = rule.resources === "*" || rule.resources.includes(resource);

      const conditionResults: ConditionResult[] = [];
      let allConditionsPassed = true;

      if (roleMatched && actionMatched && resourceMatched && rule.conditions) {
        for (let i = 0; i < rule.conditions.length; i++) {
          try {
            const result = await rule.conditions[i]!(ctx);
            if (result !== true) {
              conditionResults.push({ index: i, passed: false });
              allConditionsPassed = false;
            } else {
              conditionResults.push({ index: i, passed: true });
            }
          } catch (err) {
            conditionResults.push({
              index: i,
              passed: false,
              error: err instanceof Error ? err.message : String(err),
            });
            allConditionsPassed = false;
          }
        }
      }

      const matched =
        roleMatched && actionMatched && resourceMatched &&
        (!rule.conditions || rule.conditions.length === 0 || allConditionsPassed);

      evaluatedRules.push({
        rule,
        roleMatched,
        actionMatched,
        resourceMatched,
        conditionResults,
        matched,
      });

      if (matched && !firstMatch) {
        firstMatch = rule;
      }
    }

    const allowed = firstMatch != null ? firstMatch.effect === "allow" : !this._defaultDeny;
    const effect = firstMatch?.effect ?? "default-deny";
    const reason = firstMatch
      ? `Matched rule "${firstMatch.id}"${firstMatch.description ? `: ${firstMatch.description}` : ""}`
      : "No matching rule — default deny";

    return {
      allowed,
      effect,
      reason,
      evaluatedRules,
      durationMs: performance.now() - start,
    };
  }

  // -----------------------------------------------------------------------
  // Fluent check API: can(subject).perform(action).on(resource)
  // -----------------------------------------------------------------------

  can(subject: Subject<S>): PerformStep<S> {
    return new PerformStep(this, subject);
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private validateInput(
    subject: Subject<S>,
    action: InferAction<S>,
    resource: InferResource<S>,
  ): void {
    if (!subject || typeof subject.id !== "string") {
      throw new Error("subject must be an object with a string id");
    }
    if (!Array.isArray(subject.roles)) {
      throw new Error("subject.roles must be an array");
    }
    if (!action || typeof action !== "string") {
      throw new Error("action must be a non-empty string");
    }
    if (!resource || typeof resource !== "string") {
      throw new Error("resource must be a non-empty string");
    }
  }

  private enforceTenancy(subject: Subject<S>, tenantId?: string): void {
    if (!this._strictTenancy || tenantId != null) return;
    const hasTenantScoped = subject.roles.some((r) => r.tenantId != null);
    if (hasTenantScoped) {
      throw new Error(
        "strictTenancy is enabled and subject has tenant-scoped roles, " +
        "but no tenantId was provided to evaluate(). This could cause " +
        "cross-tenant privilege escalation. Pass an explicit tenantId.",
      );
    }
  }

  private buildContext(
    subject: Subject<S>,
    action: InferAction<S>,
    resource: InferResource<S>,
    resourceContext: ResourceContext,
    tenantId?: string,
  ): EvaluationContext<S> {
    return { subject, action, resource, resourceContext, tenantId };
  }

  private evaluateConditionsSync(
    rule: PolicyRule<S>,
    ctx: EvaluationContext<S>,
  ): boolean {
    if (!rule.conditions) return true;
    for (let i = 0; i < rule.conditions.length; i++) {
      try {
        const result = rule.conditions[i]!(ctx);
        if (isThenable(result)) {
          throw new Error(ASYNC_CONDITION_EVALUATE_MSG);
        }
        if (result !== true) return false;
      } catch (err) {
        if (
          err instanceof Error &&
          err.message === ASYNC_CONDITION_EVALUATE_MSG
        ) {
          throw err;
        }
        this.emitConditionError(rule.id, i, err);
        return false;
      }
    }
    return true;
  }

  private emitConditionError(ruleId: string, conditionIndex: number, error: unknown): void {
    if (this.conditionErrorHandler) {
      try {
        this.conditionErrorHandler({ ruleId, conditionIndex, error });
      } catch {
        // error handler must not break evaluation
      }
    }
  }

  private matchRules(
    subject: Subject<S>,
    action: InferAction<S>,
    resource: InferResource<S>,
    tenantId?: string,
  ): CompiledRule<S>[] {
    const subjectRoles = this.resolveRoles(subject, tenantId);

    const matched = this.compiled.filter((compiled) => {
      const { rule } = compiled;
      if (rule.roles !== "*" && !rule.roles.some((r) => subjectRoles.has(r))) return false;
      if (rule.actions !== "*" && !this.matchesAction(compiled, action)) return false;
      if (rule.resources !== "*" && !rule.resources.includes(resource)) return false;
      return true;
    });

    return this.sortCandidates(matched);
  }

  private sortCandidates(candidates: CompiledRule<S>[]): CompiledRule<S>[] {
    return candidates.sort((a, b) => {
      const pa = a.rule.priority ?? 0;
      const pb = b.rule.priority ?? 0;
      if (pb !== pa) return pb - pa;
      if (a.rule.effect === "deny" && b.rule.effect === "allow") return -1;
      if (a.rule.effect === "allow" && b.rule.effect === "deny") return 1;
      return 0;
    });
  }

  private matchesAction(
    compiled: CompiledRule<S>,
    action: InferAction<S>,
  ): boolean {
    const { rule, actionPatterns } = compiled;
    if (rule.actions === "*") return true;
    const actionStr = action as string;
    if ((rule.actions as string[]).includes(actionStr)) return true;
    if (actionPatterns) {
      for (const pattern of actionPatterns) {
        if (pattern.test(actionStr)) return true;
      }
    }
    return false;
  }

  private resolveRoles(
    subject: Subject<S>,
    tenantId?: string,
  ): Set<string> {
    const directRoles = new Set<string>();
    for (const assignment of subject.roles) {
      if (tenantId == null || assignment.tenantId == null || assignment.tenantId === tenantId) {
        directRoles.add(assignment.role);
      }
    }

    if (!this.hierarchy) return directRoles;

    const expanded = new Set<string>();
    for (const role of directRoles) {
      for (const r of this.hierarchy.resolve(role as InferRole<S>)) {
        expanded.add(r);
      }
    }
    return expanded;
  }

  private buildDecision(
    matched: PolicyRule<S> | null,
    ctx: EvaluationContext<S>,
    start: number,
  ): Decision<S> {
    const allowed =
      matched != null ? matched.effect === "allow" : !this._defaultDeny;
    const effect = matched?.effect ?? "default-deny";
    const reason = matched
      ? `Matched rule "${matched.id}"${matched.description ? `: ${matched.description}` : ""}`
      : "No matching rule — default deny";

    return {
      allowed,
      effect,
      matchedRule: matched,
      subject: ctx.subject,
      action: ctx.action,
      resource: ctx.resource,
      resourceContext: ctx.resourceContext,
      tenantId: ctx.tenantId,
      timestamp: Date.now(),
      durationMs: performance.now() - start,
      reason,
    };
  }
}

// ---------------------------------------------------------------------------
// Fluent check chain: can(user).perform(action).on(resource)
// ---------------------------------------------------------------------------

class PerformStep<S extends SchemaDefinition> {
  constructor(
    private engine: AccessEngine<S>,
    private subject: Subject<S>,
  ) {}

  perform(action: InferAction<S>): OnStep<S> {
    return new OnStep(this.engine, this.subject, action);
  }
}

class OnStep<S extends SchemaDefinition> {
  constructor(
    private engine: AccessEngine<S>,
    private subject: Subject<S>,
    private action: InferAction<S>,
  ) {}

  on(
    resource: InferResource<S>,
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): Decision<S> {
    return this.engine.evaluate(
      this.subject,
      this.action,
      resource,
      resourceContext,
      tenantId,
    );
  }

  async onAsync(
    resource: InferResource<S>,
    resourceContext: ResourceContext = {},
    tenantId?: string,
  ): Promise<Decision<S>> {
    return this.engine.evaluateAsync(
      this.subject,
      this.action,
      resource,
      resourceContext,
      tenantId,
    );
  }
}

// ---------------------------------------------------------------------------
// Simple LRU cache
// ---------------------------------------------------------------------------

function buildCacheKey(
  subjectId: string,
  action: string,
  resource: string,
  tenantId?: string,
): string {
  return `${subjectId.length}:${subjectId}\0${action}\0${resource}\0${tenantId ?? ""}`;
}

class LRUCache<V> {
  private map = new Map<string, V>();
  readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get size(): number {
    return this.map.size;
  }

  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  clear(): void {
    this.map.clear();
  }
}
