# Your Authorization Logic is Scattered Across 47 Route Handlers

Welcome!

I am very glad you're here. Without wasting any of your time, let's cut to the chase.

Picture this: You're building a multi-tenant SaaS platform. Companies sign up, invite their teams, manage invoices. Business is growing. Three tenants onboarded this month alone. Everything's humming along until one Friday afternoon, a customer from Tenant B emails support: "I can see invoices that don't belong to us."

Your heart sinks. You dive into the codebase, searching for the authorization check on the invoice endpoint. And you find this:

```typescript
app.get('/invoices/:id', async (req, res) => {
  const user = req.user
  const invoice = await db.invoices.findById(req.params.id)

  if (user.role !== 'admin' && user.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json(invoice)
})
```

Do you see it? The role check is there. It looks correct. But where's the tenant check? The user is an admin in Tenant A and a viewer in Tenant B. This handler doesn't know which tenant the request is for. It just sees "admin" and waves them through. Tenant B's invoices are wide open.

"It's just a missing check," you might think. But this isn't about one forgotten `if` statement. This is about a deeper problem that's been hiding in our Node.js applications for years. A problem that no amount of careful code review will reliably catch, because the architecture itself is working against us.

I've watched this pattern play out in multiple codebases. Teams start with a simple role check in a route handler. It works. Then they add another. And another. Six months later, authorization logic is scattered across 47 route handlers, 12 middleware functions, and a couple of utility files that "everyone knows about." When someone asks "can a manager approve invoices in Tenant B?" — nobody can answer without reading half the codebase.

## The Problem: Authorization Systems Are Stuck in the CRUD Era

Let's be honest. Most Node.js authorization libraries were built for a simpler time. A time when applications had one tenant, permissions mapped neatly to `create`, `read`, `update`, `delete`, and the hardest authorization question was "is this user an admin?"

But modern SaaS apps don't think in CRUD. They think in domain verbs. You don't "update" an invoice — you `approve` it, `send` it, `void` it. You don't "delete" a project — you `archive` it. And your users aren't just "admins" or "viewers" in a flat system. They're admins in one tenant and viewers in another. That's not an edge case — that's Tuesday.

```typescript
// What CRUD-era libraries expect
ac.grant('admin').updateAny('invoice')

// What your business actually needs
"Can this user approve this invoice in this tenant,
 given that they own it and it hasn't been finalized?"
```

And yet, here we are, trying to squeeze domain-rich authorization into CRUD-shaped boxes. When the box doesn't fit, we do what developers always do — we improvise. And that's when things get dangerous.

## The Evolution of Authorization Regret

Before we get to the solution, let's trace the path that most teams walk. I've walked it myself. You probably have too.

### Stage 1: The "Inline Checks" Phase

It starts innocently enough. You need to protect a route. You add an `if` statement.

```typescript
app.post('/invoices/:id/approve', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  // approve logic
})
```

Clean. Simple. Readable. You move on to the next feature. A few weeks later, another route needs protection. You add another `if`. Then another. Then you realize some routes need ownership checks, so you add those inline too.

```typescript
app.put('/invoices/:id', async (req, res) => {
  const invoice = await db.invoices.findById(req.params.id)

  if (req.user.role === 'member' && invoice.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.user.role === 'viewer') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // update logic
})
```

Before you know it, authorization logic is everywhere and nowhere at the same time. Every route has its own interpretation of the rules. When the business says "managers should no longer be able to send invoices," you have to grep the entire codebase and hope you didn't miss one.

### Stage 2: The "Let's Use a Library" Phase

You've felt the pain. You reach for a library. You find one that looks great — role-based, well-documented, decent API.

```typescript
import AccessControl from 'accesscontrol'

const ac = new AccessControl()
ac.grant('viewer').readAny('invoice')
ac.grant('member').createOwn('invoice').readOwn('invoice')
ac.grant('manager').extend('member').updateAny('invoice').deleteAny('invoice')
ac.grant('admin').extend('manager').createAny('invoice').readAny('invoice')
```

Better! Centralized. But then product comes to you and says: "We need managers to be able to `approve` invoices and `archive` projects."

Approve? Archive? Those aren't CRUD operations. The library gives you `create`, `read`, `update`, `delete` — and that's it. So you start overloading. "Approve" becomes `update`. "Archive" becomes `delete`. Six months later, a new developer looks at the policy and asks: "Why does 'delete' on a project mean archive? And why does 'update' on an invoice mean three different things depending on the handler?"

The abstraction has become a lie.

### Stage 3: The "DSL Will Save Us" Phase

You discover a more powerful library. It has its own policy language, its own model configuration, its own ecosystem.

```
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
```

Powerful? Absolutely. But now you're maintaining two languages. Your TypeScript code doesn't know what your policy file says. Your IDE can't autocomplete your actions. A typo in the policy file? You'll find out at runtime — possibly in production.

### Stage 4: The "Multi-Tenancy as an Afterthought" Phase

And then the real gut punch: multi-tenancy. Your user is an admin in one organization and a viewer in another. The library you chose has no concept of tenants. So you bolt it on.

```typescript
app.use((req, res, next) => {
  const tenantId = req.headers['x-tenant-id']
  const userRoleInTenant = getUserRoleForTenant(req.user, tenantId)
  req.user.effectiveRole = userRoleInTenant
  next()
})
```

Every middleware, every check, every route — they all need to remember to use `effectiveRole` instead of `role`. One handler forgets, and you have a cross-tenant data leak. The kind that makes customers leave.

Sound familiar? It should. This is the path that leads to the Friday afternoon email from Tenant B.

## The Light Bulb Moment

Here's where it gets interesting. What if we stopped trying to retrofit authorization onto systems that weren't designed for it? What if we started from different assumptions?

What if:
- Your domain actions were first-class? Not `update`, but `invoice:approve`, `project:archive`, `user:impersonate`.
- Multi-tenancy was the default, not a bolt-on? A user has roles *per tenant*. That's the data model, not an edge case.
- TypeScript worked *for* you? Autocomplete on your actions, your roles, your resources — everywhere. Policies, conditions, middleware.
- Every authorization decision was observable? Not just "allowed" or "denied," but *why*. Which rule matched. How long it took. The full context.
- Your policies lived in one place? Not scattered across dozens of files.

So I built [Sentinel](https://github.com/vegtelenseg/sentinel). And this is what it looks like.

## Modeling Your Domain, Not CRUD

The first thing you do is define your schema. Not in a DSL. Not in a config file. In TypeScript.

```typescript
import { AccessEngine, createPolicyFactory, RoleHierarchy } from '@siremzam/sentinel'
import type { SchemaDefinition, Subject } from '@siremzam/sentinel'

interface MySchema extends SchemaDefinition {
  roles: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'
  resources: 'invoice' | 'project' | 'user'
  actions:
    | 'invoice:create'
    | 'invoice:read'
    | 'invoice:approve'
    | 'invoice:send'
    | 'project:read'
    | 'project:archive'
    | 'user:read'
    | 'user:impersonate'
}
```

That's it. TypeScript now knows every valid role, resource, and action in your system. Try to reference `invoice:delete` and your IDE will underline it in red before you finish typing. Try to assign a role called `superadmin` and the compiler says no. Your schema is your contract, enforced at compile time.

Now, policies. Not strings in a config file. Not CRUD mappings. A fluent builder API that reads like English:

```typescript
const { allow, deny } = createPolicyFactory<MySchema>()

const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
})

engine.addRules(
  allow()
    .id('admin-full-access')
    .roles('admin', 'owner')
    .anyAction()
    .anyResource()
    .describe('Admins and owners have full access')
    .build(),

  allow()
    .id('manager-invoices')
    .roles('manager')
    .actions('invoice:*' as MySchema['actions'])
    .on('invoice')
    .describe('Managers can do anything with invoices')
    .build(),

  allow()
    .id('member-own-invoices')
    .roles('member')
    .actions('invoice:read', 'invoice:create')
    .on('invoice')
    .when(ctx => ctx.subject.id === ctx.resourceContext.ownerId)
    .describe('Members can read/create their own invoices')
    .build(),

  deny()
    .id('no-impersonation')
    .anyRole()
    .actions('user:impersonate')
    .on('user')
    .describe('Nobody can impersonate by default')
    .build(),

  allow()
    .id('owner-impersonate')
    .roles('owner')
    .actions('user:impersonate')
    .on('user')
    .priority(10)
    .describe('Except owners, who can impersonate')
    .build(),
)
```

Read that out loud. "Allow managers to perform any invoice action on invoices." "Deny any role from impersonating users." "Except owners, who can impersonate, at priority 10." These are not code artifacts you have to decode. These are policy statements that a product manager could review.

And notice the `.when()` on the member rule — that's an ABAC condition. Full TypeScript. Not a MongoDB-style query object. Not a matcher string. A function that receives the evaluation context with complete type safety. You can do date math, ownership checks, async database lookups — whatever your domain requires.

## Multi-Tenancy That Doesn't Leak

Remember our Tenant B nightmare? Here's what multi-tenancy looks like when it's a first-class concept:

```typescript
const user: Subject<MySchema> = {
  id: 'user-42',
  roles: [
    { role: 'admin', tenantId: 'tenant-a' },
    { role: 'viewer', tenantId: 'tenant-b' },
  ],
}

// In Tenant A: user is admin — full access
const d1 = engine.evaluate(user, 'invoice:approve', 'invoice', {}, 'tenant-a')
// d1.allowed === true

// In Tenant B: user is viewer — no approval rights
const d2 = engine.evaluate(user, 'invoice:approve', 'invoice', {}, 'tenant-b')
// d2.allowed === false
```

Roles are scoped to tenants *in the data model itself*. You don't bolt on tenant filtering. You don't rely on middleware to rewrite the user object. The engine understands that `user-42` is an admin *here* and a viewer *there*, and it evaluates accordingly.

But what about that developer who forgets to pass the tenant ID? The one who writes `engine.evaluate(user, 'invoice:read', 'invoice')` without a tenant context? That's exactly the bug that caused the Tenant B leak.

Sentinel has an answer for that too:

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  strictTenancy: true,
})

// This THROWS — tenantId is required because the user has tenant-scoped roles
engine.evaluate(user, 'invoice:read', 'invoice')
// Error: strictTenancy is enabled and subject has tenant-scoped roles,
// but no tenantId was provided. This could cause cross-tenant privilege escalation.
```

Fail loud. Fail at development time. Not on a Friday afternoon with a customer email.

## "Why Was This Denied?" — Authorization You Can Explain

Here's something that always frustrated me about authorization libraries: they give you a boolean. `true` or `false`. Allowed or denied. But when something goes wrong — and it will — you need to know *why*.

Why was this user denied? Which rule matched? Was it a role mismatch? An action mismatch? Did a condition fail? Was it a priority conflict?

Sentinel's `explain()` method gives you the full trace:

```typescript
const result = engine.explain(user, 'invoice:approve', 'invoice', {}, 'tenant-b')

console.log(result.allowed)  // false
console.log(result.reason)   // "No matching rule — default deny"

for (const evalRule of result.evaluatedRules) {
  console.log({
    ruleId: evalRule.rule.id,
    roleMatched: evalRule.roleMatched,
    actionMatched: evalRule.actionMatched,
    resourceMatched: evalRule.resourceMatched,
    conditionResults: evalRule.conditionResults,
    matched: evalRule.matched,
  })
}
```

Every rule in the system, evaluated against the request, with per-field match results and per-condition outcomes. When a test fails, the explain trace tells you exactly *what changed*. When a customer reports an access issue, you don't grep logs — you replay the evaluation.

And for production observability, every evaluation emits a structured decision event:

```typescript
const engine = new AccessEngine<MySchema>({
  schema: {} as MySchema,
  onDecision: (decision) => {
    const entry = toAuditEntry(decision)
    auditLog.write(entry)
  },
})
```

Every `allow`. Every `deny`. The matched rule, the evaluation duration, the full request context — serialization-safe and ready for your audit trail. Because if you can't audit your authorization decisions, you can't trust them.

## Testing Authorization Like Business Logic

Authorization policies are security-critical code. They deserve the same testing discipline as your payment processing or data validation. The `explain()` method makes this natural:

```typescript
describe('invoice policies', () => {
  it('allows managers to approve invoices in their tenant', () => {
    const result = engine.explain(manager, 'invoice:approve', 'invoice', {}, 'acme')

    expect(result.allowed).toBe(true)
    expect(result.reason).toContain('manager-invoices')
  })

  it('denies viewers from approving invoices', () => {
    const result = engine.explain(viewer, 'invoice:approve', 'invoice', {}, 'acme')

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('No matching rule — default deny')
  })

  it('prevents cross-tenant access', () => {
    // user is admin in acme, viewer in globex
    const acme = engine.evaluate(user, 'invoice:approve', 'invoice', {}, 'acme')
    const globex = engine.evaluate(user, 'invoice:approve', 'invoice', {}, 'globex')

    expect(acme.allowed).toBe(true)
    expect(globex.allowed).toBe(false)
  })

  it('respects ownership conditions', () => {
    const result = engine.explain(
      member,
      'invoice:read',
      'invoice',
      { ownerId: 'someone-else' },
      'acme'
    )

    const ownershipRule = result.evaluatedRules.find(
      e => e.rule.id === 'member-own-invoices'
    )
    expect(ownershipRule?.conditionResults[0]?.passed).toBe(false)
  })
})
```

These tests don't just assert booleans. They document *why* access was granted or denied. When a test breaks six months from now, the new developer on your team won't have to reverse-engineer the policy — the explain trace tells the story.

## Plugging Into Your Framework

Centralized policies are only useful if they're easy to enforce. Sentinel ships middleware for the frameworks you're already using:

**Express:**

```typescript
import { guard } from '@siremzam/sentinel/middleware/express'

app.post(
  '/invoices/:id/approve',
  guard(engine, 'invoice:approve', 'invoice', {
    getSubject: (req) => req.user,
    getResourceContext: (req) => ({ id: req.params.id }),
    getTenantId: (req) => req.headers['x-tenant-id'],
  }),
  handler,
)
```

**Hono:**

```typescript
import { honoGuard } from '@siremzam/sentinel/middleware/hono'

app.post(
  '/invoices/:id/approve',
  honoGuard(engine, 'invoice:approve', 'invoice', {
    getSubject: (c) => c.get('user'),
    getResourceContext: (c) => ({ id: c.req.param('id') }),
    getTenantId: (c) => c.req.header('x-tenant-id'),
  }),
  handler,
)
```

**NestJS:**

```typescript
import { createAuthorizeDecorator, createAuthGuard } from '@siremzam/sentinel/middleware/nestjs'

const Authorize = createAuthorizeDecorator<MySchema>()

@Controller('invoices')
class InvoiceController {
  @Post(':id/approve')
  @Authorize('invoice:approve', 'invoice')
  approve(@Param('id') id: string) {
    return { approved: true }
  }
}
```

One line per route. The policy is defined once. The middleware enforces it. No scattered `if` statements. No forgotten checks.

And if your architecture is polyglot — say a Go API and a Python worker that both need to check the same policies — Sentinel can run as a standalone authorization server:

```typescript
import { createAuthServer } from '@siremzam/sentinel/server'

const server = createAuthServer({
  engine,
  port: 3100,
  authenticate: (req) => req.headers['x-api-key'] === process.env.AUTH_SERVER_KEY,
})

await server.start()
```

Zero dependencies. Built on Node's `http` module. Your Go service hits `POST /evaluate`, your Python worker hits `POST /evaluate`, and they both get the same policy decisions.

## What I Learned Building This

Building Sentinel taught me a few things I think are worth sharing.

**Deny by default is not just a security pattern — it's a design philosophy.** When the default answer is "no," you're forced to be intentional about every "yes." Every permission is a conscious decision, not an oversight. I made this the foundation: if no rule matches, the answer is no. If a condition throws an error, it evaluates to `false`. No silent privilege escalation. Ever.

**Types are not just developer convenience — they're a trust mechanism.** When your IDE autocompletes `invoice:approve` and rejects `invoice:aprove`, that's not syntax highlighting. That's a security boundary enforced at compile time. Every typo caught by the compiler is a potential authorization bug that never reaches production.

**Observability is not optional for authorization.** You wouldn't deploy a payment system without logging every transaction. Why do we deploy authorization systems that give us nothing but a boolean? Every decision in Sentinel is a structured event — who asked, what they asked for, what the answer was, which rule decided it, and how long it took. Because "why was this denied?" shouldn't require a debugging session.

**Multi-tenancy is not a feature you add later.** It's a data model decision you make on day one. The moment you separate "what role does this user have" from "in which tenant," you've already won half the battle. Bolting on tenant checks after the fact is like adding seatbelts to a car that's already on the highway.

And perhaps most importantly: **your authorization logic belongs in one place.** Not in 47 route handlers. Not in a mix of middleware and utility functions. Not in a DSL that your IDE can't read. In one engine, with typed policies, observable decisions, and framework-agnostic middleware that slots into whatever you're building.

## The Numbers

For those who care about performance (and you should — authorization sits in every request path):

| Scenario | 100 rules | 1,000 rules |
|---|---|---|
| `evaluate` (no cache) | 4.3 µs / 231k ops/s | 42.6 µs / 23k ops/s |
| `evaluate` (cache hit) | 0.6 µs / 1.66M ops/s | 1.8 µs / 553k ops/s |

Most SaaS apps have 10–50 rules. At 100 rules, a single evaluation takes **4.3 microseconds**. With caching, **0.6 microseconds**. Zero runtime dependencies. About 1,800 lines of code with a 1:1 test-to-code ratio.

## Try It

If any of this resonated — if you've ever debugged a cross-tenant leak at 11 PM, or grepped for role checks across your codebase, or wished your authorization library understood that `approve` is not `update` — give Sentinel a look.

**[Open the interactive playground →](https://vegtelenseg.github.io/sentinel-example/)**

Policy editor, multi-tenant evaluation, explain traces, and audit log — all running in the browser.

```bash
npm install @siremzam/sentinel
```

[GitHub](https://github.com/vegtelenseg/sentinel) · [npm](https://www.npmjs.com/package/@siremzam/sentinel) · [Playground source](https://github.com/vegtelenseg/sentinel-example)

---

Alright! That is it, folks!

Next time you're about to add another `if (user.role === 'admin')` in a route handler, take a moment. Think about the developer who'll maintain this six months from now. Think about Tenant B. They'll thank you for those few extra minutes you spent on a proper authorization layer.

Thank you for your time! 🙏
