import type {
  SchemaDefinition,
  InferRole,
  InferAction,
  InferResource,
  PolicyRule,
  PolicyEffect,
  Condition,
} from "./types.js";

let ruleCounter = 0;

function nextRuleId(prefix: string): string {
  return `${prefix}-${++ruleCounter}`;
}

export class RuleBuilder<S extends SchemaDefinition> {
  private _effect: PolicyEffect;
  private _roles: InferRole<S>[] | "*" = "*";
  private _actions: InferAction<S>[] | "*" = "*";
  private _resources: InferResource<S>[] | "*" = "*";
  private _conditions: Condition<S>[] = [];
  private _priority = 0;
  private _description?: string;
  private _id: string;

  constructor(effect: PolicyEffect) {
    this._effect = effect;
    this._id = nextRuleId(effect);
  }

  id(id: string): this {
    this._id = id;
    return this;
  }

  roles(...roles: InferRole<S>[]): this {
    this._roles = roles;
    return this;
  }

  anyRole(): this {
    this._roles = "*";
    return this;
  }

  actions(...actions: InferAction<S>[]): this {
    this._actions = actions;
    return this;
  }

  anyAction(): this {
    this._actions = "*";
    return this;
  }

  on(...resources: InferResource<S>[]): this {
    this._resources = resources;
    return this;
  }

  anyResource(): this {
    this._resources = "*";
    return this;
  }

  when(condition: Condition<S>): this {
    this._conditions.push(condition);
    return this;
  }

  priority(p: number): this {
    this._priority = p;
    return this;
  }

  describe(desc: string): this {
    this._description = desc;
    return this;
  }

  build(): PolicyRule<S> {
    return {
      id: this._id,
      effect: this._effect,
      roles: this._roles,
      actions: this._actions,
      resources: this._resources,
      conditions: this._conditions.length > 0 ? this._conditions : undefined,
      priority: this._priority,
      description: this._description,
    };
  }
}

export function allow<S extends SchemaDefinition>(): RuleBuilder<S> {
  return new RuleBuilder<S>("allow");
}

export function deny<S extends SchemaDefinition>(): RuleBuilder<S> {
  return new RuleBuilder<S>("deny");
}

/**
 * Creates schema-bound allow/deny factories so you don't need to pass
 * the generic parameter on every call.
 *
 * ```ts
 * const { allow, deny } = createPolicyFactory<MySchema>();
 * allow().roles("admin").anyAction().anyResource().build();
 * ```
 */
export function createPolicyFactory<S extends SchemaDefinition>(): {
  allow: () => RuleBuilder<S>;
  deny: () => RuleBuilder<S>;
} {
  return {
    allow: () => new RuleBuilder<S>("allow"),
    deny: () => new RuleBuilder<S>("deny"),
  };
}
