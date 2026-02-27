import express from "express";
import {
  AccessEngine,
  createPolicyFactory,
  RoleHierarchy,
  toAuditEntry,
} from "../../src/index.js";
import { guard } from "../../src/middleware/express.js";
import type { SchemaDefinition, Subject } from "../../src/index.js";

// ---------------------------------------------------------------------------
// 1. Schema — your domain, not CRUD
// ---------------------------------------------------------------------------

interface AppSchema extends SchemaDefinition {
  roles: "owner" | "admin" | "member" | "viewer";
  resources: "invoice" | "project" | "user";
  actions:
  | "invoice:create"
  | "invoice:read"
  | "invoice:approve"
  | "invoice:send"
  | "project:read"
  | "project:archive"
  | "user:read"
  | "user:invite";
}

// ---------------------------------------------------------------------------
// 2. Role hierarchy
// ---------------------------------------------------------------------------

const hierarchy = new RoleHierarchy<AppSchema>()
  .define("owner", ["admin"])
  .define("admin", ["member"])
  .define("member", ["viewer"]);

// ---------------------------------------------------------------------------
// 3. Engine + policies
// ---------------------------------------------------------------------------

const { allow, deny } = createPolicyFactory<AppSchema>();

const engine = new AccessEngine<AppSchema>({
  schema: {} as AppSchema,
  roleHierarchy: hierarchy,
  strictTenancy: true,
  onDecision: (decision) => {
    const entry = toAuditEntry(decision);
    console.log("[audit]", JSON.stringify(entry));
  },
});

engine.addRules(
  allow()
    .id("viewer-read")
    .roles("viewer")
    .actions("invoice:read", "project:read", "user:read")
    .anyResource()
    .describe("Viewers can read anything")
    .build(),

  allow()
    .id("member-create")
    .roles("member")
    .actions("invoice:create")
    .on("invoice")
    .describe("Members can create invoices")
    .build(),

  allow()
    .id("admin-approve-send")
    .roles("admin")
    .actions("invoice:approve", "invoice:send")
    .on("invoice")
    .describe("Admins can approve and send invoices")
    .build(),

  allow()
    .id("admin-archive")
    .roles("admin")
    .actions("project:archive")
    .on("project")
    .describe("Admins can archive projects")
    .build(),

  allow()
    .id("admin-invite")
    .roles("admin")
    .actions("user:invite")
    .on("user")
    .describe("Admins can invite users")
    .build(),

  allow()
    .id("owner-all")
    .roles("owner")
    .anyAction()
    .anyResource()
    .priority(10)
    .describe("Owners have full access")
    .build(),
);

// ---------------------------------------------------------------------------
// 4. Simulated user database (multi-tenant)
// ---------------------------------------------------------------------------

const USERS: Record<string, Subject<AppSchema>> = {
  alice: {
    id: "alice",
    roles: [
      { role: "admin", tenantId: "acme" },
      { role: "viewer", tenantId: "globex" },
    ],
  },
  bob: {
    id: "bob",
    roles: [
      { role: "member", tenantId: "acme" },
      { role: "member", tenantId: "globex" },
    ],
  },
  carol: {
    id: "carol",
    roles: [{ role: "owner", tenantId: "acme" }],
  },
};

// ---------------------------------------------------------------------------
// 5. Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

declare global {
  namespace Express {
    interface Request {
      user?: Subject<AppSchema>;
    }
  }
}

app.use((req, _res, next) => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (userId && USERS[userId]) {
    req.user = USERS[userId];
  }
  next();
});

const getSubject = (req: express.Request) => req.user!;
const getTenantId = (req: express.Request) => req.headers["x-tenant-id"] as string;

// --- Routes ---

app.get("/health", (_req, res) => {
  res.json({ status: "ok", rules: engine.getRules().length });
});

app.get(
  "/invoices",
  guard(engine, "invoice:read", "invoice", { getSubject, getTenantId }),
  (_req, res) => {
    res.json({ invoices: [{ id: "inv-1", amount: 500 }, { id: "inv-2", amount: 1200 }] });
  },
);

app.post(
  "/invoices/:id/approve",
  guard(engine, "invoice:approve", "invoice", {
    getSubject,
    getResourceContext: (req) => ({ id: (req.params as Record<string, string>).id }),
    getTenantId,
  }),
  (req, res) => {
    res.json({ approved: true, invoiceId: req.params.id });
  },
);

app.get("/invoices/permissions", (req, res) => {
  const user = getSubject(req);
  const tenantId = getTenantId(req);
  const actions = engine.permitted(
    user,
    "invoice",
    ["invoice:create", "invoice:read", "invoice:approve", "invoice:send"],
    {},
    tenantId,
  );
  res.json({ userId: user.id, tenantId, permitted: [...actions] });
});

app.get("/debug/explain", (req, res) => {
  const user = getSubject(req);
  const tenantId = getTenantId(req);
  const action = req.query.action as AppSchema["actions"];
  const resource = req.query.resource as AppSchema["resources"];
  const result = engine.explain(user, action, resource, {}, tenantId);
  res.json(result);
});

const PORT = process.env.PORT ?? 3050;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}`);
  console.log(`Users: alice (admin@acme, viewer@globex), bob (member@acme+globex), carol (owner@acme)`);
});
