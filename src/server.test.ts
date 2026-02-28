import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow, deny } from "./policy-builder.js";
import { createAuthServer } from "./server.js";
import type { SchemaDefinition } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "member" | "viewer";
  resources: "invoice" | "project";
  actions: "invoice:create" | "invoice:read" | "invoice:approve" | "project:read";
}

const schema: TestSchema = {} as TestSchema;

describe("Authorization Server", () => {
  const engine = new AccessEngine<TestSchema>({ schema });
  engine.addRules(
    allow<TestSchema>().id("admin-all").roles("admin").anyAction().anyResource().build(),
    allow<TestSchema>().id("viewer-read").roles("viewer").actions("invoice:read", "project:read").anyResource().build(),
    deny<TestSchema>().id("no-approve-viewer").roles("viewer").actions("invoice:approve").on("invoice").build(),
  );

  const server = createAuthServer({ engine, port: 0 });
  let baseUrl: string;

  beforeAll(async () => {
    await server.start();
    const addr = server.httpServer.address();
    if (typeof addr === "object" && addr) {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  afterAll(async () => {
    await server.stop();
  });

  it("GET /health returns ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.rulesLoaded).toBe(3);
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("GET /rules returns all rules", async () => {
    const res = await fetch(`${baseUrl}/rules`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.rules).toHaveLength(3);
    expect(body.rules[0].id).toBe("admin-all");
  });

  it("POST /evaluate allows admin", async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: { id: "u1", roles: [{ role: "admin" }] },
        action: "invoice:approve",
        resource: "invoice",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.allowed).toBe(true);
    expect(body.matchedRuleId).toBe("admin-all");
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("POST /evaluate denies viewer from approving", async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: { id: "u2", roles: [{ role: "viewer" }] },
        action: "invoice:approve",
        resource: "invoice",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.allowed).toBe(false);
  });

  it("POST /evaluate with tenantId", async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: {
          id: "u3",
          roles: [
            { role: "admin", tenantId: "t1" },
            { role: "viewer", tenantId: "t2" },
          ],
        },
        action: "invoice:approve",
        resource: "invoice",
        tenantId: "t2",
      }),
    });
    const body = await res.json();
    expect(body.allowed).toBe(false);
  });

  it("POST /evaluate returns 400 for invalid JSON", async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
  });

  it("POST /evaluate returns 400 for missing fields", async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: { id: "u1", roles: [] } }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /unknown returns 404", async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    expect(res.status).toBe(404);
  });
});
