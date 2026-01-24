import type {
  SchemaDefinition,
  PolicyRule,
  PolicyEffect,
  Condition,
} from "./types.js";

// ---------------------------------------------------------------------------
// JSON-safe policy representation (conditions become named references)
// ---------------------------------------------------------------------------

export interface JsonPolicyRule {
  id: string;
  effect: PolicyEffect;
  roles: string[] | "*";
  actions: string[] | "*";
  resources: string[] | "*";
  conditions?: string[];
  priority?: number;
  description?: string;
}

export interface JsonPolicyDocument {
  version: 1;
  rules: JsonPolicyRule[];
}

/**
 * A registry that maps condition names to condition functions.
 * This allows JSON policies to reference conditions by name
 * while keeping the actual logic in code.
 *
 * ```ts
 * const conditions = new ConditionRegistry<MySchema>();
 * conditions.register("isOwner", ctx => ctx.subject.id === ctx.resourceContext.ownerId);
 * conditions.register("isActive", ctx => ctx.resourceContext.status === "active");
 * ```
 */
export class ConditionRegistry<S extends SchemaDefinition> {
  private conditions = new Map<string, Condition<S>>();

  register(name: string, condition: Condition<S>): this {
    if (!name || typeof name !== "string") {
      throw new Error("Condition name must be a non-empty string");
    }
    if (typeof condition !== "function") {
      throw new Error(`Condition "${name}" must be a function`);
    }
    this.conditions.set(name, condition);
    return this;
  }

  get(name: string): Condition<S> | undefined {
    return this.conditions.get(name);
  }

  has(name: string): boolean {
    return this.conditions.has(name);
  }

  names(): string[] {
    return [...this.conditions.keys()];
  }
}

// ---------------------------------------------------------------------------
// Export: PolicyRule[] → JSON
// ---------------------------------------------------------------------------

/**
 * Serialize rules to a JSON-safe document.
 * Conditions are stripped unless a reverse lookup map is provided.
 */
export function exportRules<S extends SchemaDefinition>(
  rules: ReadonlyArray<PolicyRule<S>>,
  conditionNames?: Map<Condition<S>, string>,
): JsonPolicyDocument {
  const jsonRules: JsonPolicyRule[] = rules.map((rule) => {
    const jr: JsonPolicyRule = {
      id: rule.id,
      effect: rule.effect,
      roles: rule.roles,
      actions: rule.actions as string[] | "*",
      resources: rule.resources as string[] | "*",
      priority: rule.priority,
      description: rule.description,
    };

    if (rule.conditions && conditionNames) {
      const names: string[] = [];
      for (const cond of rule.conditions) {
        const name = conditionNames.get(cond);
        if (name) names.push(name);
      }
      if (names.length > 0) jr.conditions = names;
    }

    return jr;
  });

  return { version: 1, rules: jsonRules };
}

/**
 * Serialize rules to a JSON string.
 */
export function exportRulesToJson<S extends SchemaDefinition>(
  rules: ReadonlyArray<PolicyRule<S>>,
  conditionNames?: Map<Condition<S>, string>,
): string {
  return JSON.stringify(exportRules(rules, conditionNames), null, 2);
}

// ---------------------------------------------------------------------------
// Import: JSON → PolicyRule[]
// ---------------------------------------------------------------------------

/**
 * Deserialize a JSON policy document into PolicyRule objects.
 * Condition names are resolved via the provided registry.
 */
export function importRules<S extends SchemaDefinition>(
  doc: JsonPolicyDocument,
  registry?: ConditionRegistry<S>,
): PolicyRule<S>[] {
  if (!doc || typeof doc !== "object") {
    throw new Error("Policy document must be a non-null object");
  }
  if (doc.version !== 1) {
    throw new Error(`Unsupported policy document version: ${doc.version}`);
  }
  if (!Array.isArray(doc.rules)) {
    throw new Error("Policy document must have a 'rules' array");
  }

  return doc.rules.map((jr, index) => {
    if (!jr || typeof jr !== "object") {
      throw new Error(`Rule at index ${index} must be a non-null object`);
    }

    if (!jr.id || typeof jr.id !== "string") {
      throw new Error(`Rule at index ${index} is missing a valid "id" field.`);
    }

    if (jr.effect !== "allow" && jr.effect !== "deny") {
      throw new Error(
        `Invalid effect "${jr.effect}" in rule "${jr.id}". Must be "allow" or "deny".`,
      );
    }

    if (jr.roles !== "*" && !Array.isArray(jr.roles)) {
      throw new Error(`Rule "${jr.id}": roles must be "*" or an array of strings`);
    }
    if (jr.actions !== "*" && !Array.isArray(jr.actions)) {
      throw new Error(`Rule "${jr.id}": actions must be "*" or an array of strings`);
    }
    if (jr.resources !== "*" && !Array.isArray(jr.resources)) {
      throw new Error(`Rule "${jr.id}": resources must be "*" or an array of strings`);
    }

    const conditions: Condition<S>[] = [];
    if (jr.conditions && registry) {
      for (const name of jr.conditions) {
        const cond = registry.get(name);
        if (!cond) {
          throw new Error(
            `Unknown condition "${name}" in rule "${jr.id}". ` +
            `Registered conditions: ${registry.names().join(", ") || "(none)"}`,
          );
        }
        conditions.push(cond);
      }
    }

    return {
      id: jr.id,
      effect: jr.effect,
      roles: jr.roles,
      actions: jr.actions,
      resources: jr.resources,
      conditions: conditions.length > 0 ? conditions : undefined,
      priority: jr.priority,
      description: jr.description,
    } as PolicyRule<S>;
  });
}

/**
 * Parse a JSON string into PolicyRule objects.
 */
export function importRulesFromJson<S extends SchemaDefinition>(
  json: string,
  registry?: ConditionRegistry<S>,
): PolicyRule<S>[] {
  let doc: JsonPolicyDocument;
  try {
    doc = JSON.parse(json) as JsonPolicyDocument;
  } catch (err) {
    throw new Error(
      `Failed to parse policy JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return importRules(doc, registry);
}
