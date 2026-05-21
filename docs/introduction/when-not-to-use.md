# When not to use Sentinel

[← Documentation home](/)

Sentinel is opinionated. Choosing the wrong tool costs more than choosing no tool. This page lists honest boundaries so you can decide early.

---

## You need a full policy language (Rego, Cedar)

Sentinel policies are **TypeScript functions and data**, not a standalone declarative language with a formal semantics document.

If your organization standardizes on **Open Policy Agent (Rego)** or **AWS Cedar** for cross-service policy review, Sentinel will fight that workflow. Use OPA or Cedar for the policy VM; use Sentinel when the team wants policies colocated with the app in TypeScript.

---

## You need Zanzibar-style relationship graphs

Questions like *"Can Alice view this Google Doc because Bob shared it with her team?"* are **relationship-based**, not role-and-action based. That model needs a graph store (tuples like `user:alice#viewer@document:123`).

For that class of problem, look at:

- [SpiceDB](https://authzed.com/)
- [OpenFGA](https://openfga.dev/)

Sentinel handles RBAC + ABAC conditions well; it does not model arbitrary resource graphs or nested sharing chains.

---

## You need a hosted authorization product

If you want a dashboard, policy editor for non-engineers, embedded UI widgets, and managed sync — products like [Permit.io](https://permit.io/) or [Oso Cloud](https://www.osohq.com/) optimize for that operational model.

Sentinel runs **in your process**. You can build an admin UI on top of JSON rules, but the library does not ship one.

---

## Your model is truly just CRUD with one global role

A single `admin | user` enum and four CRUD permissions across one tenant may not justify a policy engine. Simpler libraries or a dozen lines of middleware can suffice.

Sentinel pays off when you have **multiple roles**, **tenants**, **domain verbs**, or **conditions** — the complexity you would otherwise spread across the codebase.

---

## You require synchronous evaluation only in a serverless edge with no async support

Sentinel supports async conditions via `evaluateAsync()`. If your entire platform forbids async in the authorization path and you need heavy I/O per check, you may need to precompute permissions or use a relationship store with synchronous lookups.

---

## Related pages

- [What is Sentinel?](./what-is-sentinel.md)
- [Feature comparison](../comparisons/feature-matrix.md)
