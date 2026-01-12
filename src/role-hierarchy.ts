import type { SchemaDefinition, InferRole } from "./types.js";

/**
 * Defines a role inheritance hierarchy.
 *
 * When a role inherits from another, it gains all permissions of its parent roles.
 * Cycles are detected and rejected at definition time.
 *
 * ```ts
 * const hierarchy = new RoleHierarchy<MySchema>()
 *   .define("admin", ["manager", "viewer"])
 *   .define("manager", ["member"])
 *   .define("member", ["viewer"]);
 *
 * hierarchy.resolve("admin");
 * // Set { "admin", "manager", "member", "viewer" }
 * ```
 */
export class RoleHierarchy<S extends SchemaDefinition> {
  private parents = new Map<string, string[]>();
  private cache = new Map<string, Set<string>>();

  /**
   * Define that `role` inherits permissions from `inheritsFrom` roles.
   * Clears the resolution cache.
   */
  define(role: InferRole<S>, inheritsFrom: InferRole<S>[]): this {
    this.parents.set(role, inheritsFrom as string[]);
    this.cache.clear();
    this.detectCycle(role as string, new Set());
    return this;
  }

  /**
   * Resolve the full set of roles a given role expands to,
   * including all inherited roles (transitive).
   */
  resolve(role: InferRole<S>): Set<string> {
    const roleStr = role as string;
    const cached = this.cache.get(roleStr);
    if (cached) return cached;

    const result = new Set<string>();
    this.walk(roleStr, result);
    this.cache.set(roleStr, result);
    return result;
  }

  /**
   * Resolve multiple roles at once, returning the merged set.
   */
  resolveAll(roles: Iterable<InferRole<S>>): Set<string> {
    const result = new Set<string>();
    for (const role of roles) {
      for (const r of this.resolve(role)) {
        result.add(r);
      }
    }
    return result;
  }

  /**
   * Get all defined roles that have inheritance rules.
   */
  definedRoles(): string[] {
    return [...this.parents.keys()];
  }

  private walk(role: string, visited: Set<string>): void {
    if (visited.has(role)) return;
    visited.add(role);
    const parents = this.parents.get(role);
    if (parents) {
      for (const parent of parents) {
        this.walk(parent, visited);
      }
    }
  }

  private detectCycle(role: string, visiting: Set<string>): void {
    if (visiting.has(role)) {
      throw new Error(
        `Cycle detected in role hierarchy: ${[...visiting, role].join(" → ")}`,
      );
    }
    visiting.add(role);
    const parents = this.parents.get(role);
    if (parents) {
      for (const parent of parents) {
        this.detectCycle(parent, visiting);
      }
    }
    visiting.delete(role);
  }
}
