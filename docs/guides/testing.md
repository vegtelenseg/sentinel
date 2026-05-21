# Testing policies

[← Documentation home](/)

Authorization logic deserves the same rigor as business logic. Use `explain()` in tests to assert **why** access was granted or denied.

---

## Example

```typescript
import { describe, it, expect } from "vitest";

describe("invoice policies", () => {
  it("allows managers to approve in their tenant", () => {
    const result = engine.explain(manager, "invoice:approve", "invoice", {}, "acme");
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Managers");
  });

  it("denies viewers from approving", () => {
    const result = engine.explain(viewer, "invoice:approve", "invoice", {}, "acme");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("No matching rule — default deny");
  });

  it("respects ownership conditions", () => {
    const result = engine.explain(
      member,
      "invoice:read",
      "invoice",
      { ownerId: "someone-else" },
      "acme",
    );
    const rule = result.evaluatedRules.find(e => e.rule.id === "member-own-invoices");
    expect(rule?.conditionResults[0]?.passed).toBe(false);
  });
});
```

---

## Tips

- Give rules stable `.id()` values for trace assertions.
- Test **cross-tenant** cases explicitly.
- Enable `strictTenancy` in test engines that mirror production.

---

## Related

- [explain() guide](./explain-and-debugging.md)
