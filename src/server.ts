import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AccessEngine } from "./engine.js";
import type { SchemaDefinition, Subject, ResourceContext } from "./types.js";

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024; // 1 MB

// ---------------------------------------------------------------------------
// Standalone HTTP authorization server
// ---------------------------------------------------------------------------

export interface ServerOptions<S extends SchemaDefinition> {
  engine: AccessEngine<S>;
  port?: number;
  host?: string;
  /**
   * Optional hook to resolve a Subject from the request body.
   * Defaults to using body.subject directly.
   */
  resolveSubject?: (body: EvalRequestBody) => Subject<S> | Promise<Subject<S>>;
  /**
   * Optional authentication hook. Return true to allow the request,
   * false to reject with 401. Called before any endpoint logic.
   * If not provided, all requests are allowed (suitable for internal networks only).
   */
  authenticate?: (req: IncomingMessage) => boolean | Promise<boolean>;
  /** Maximum request body size in bytes. Defaults to 1 MB. */
  maxBodyBytes?: number;
}

export interface EvalRequestBody {
  subject: {
    id: string;
    roles: { role: string; tenantId?: string }[];
    attributes?: Record<string, unknown>;
  };
  action: string;
  resource: string;
  resourceContext?: ResourceContext;
  tenantId?: string;
}

interface EvalResponseBody {
  allowed: boolean;
  effect: string;
  reason: string;
  matchedRuleId: string | null;
  durationMs: number;
}

interface HealthResponse {
  status: "ok";
  rulesLoaded: number;
  uptime: number;
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    let settled = false;

    function settle(fn: () => void) {
      if (!settled) {
        settled = true;
        fn();
      }
    }

    req.on("data", (chunk: Buffer) => {
      if (settled) return;
      received += chunk.length;
      if (received > maxBytes) {
        req.resume();
        settle(() => reject(new Error(`Request body exceeds ${maxBytes} bytes`)));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      settle(() => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
    req.on("error", (err) => {
      settle(() => reject(err));
    });
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

/**
 * Create a standalone HTTP authorization server.
 *
 * Endpoints:
 *   POST /evaluate  — evaluate an authorization request
 *   GET  /health    — health check + rule count
 *   GET  /rules     — list all loaded rules (without conditions)
 *
 * **Security**: This server has no authentication by default.
 * In production, provide an `authenticate` hook or run behind a VPN/service mesh.
 */
export function createAuthServer<S extends SchemaDefinition>(
  options: ServerOptions<S>,
) {
  const {
    engine,
    port = 3100,
    host = "0.0.0.0",
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  } = options;
  const startTime = Date.now();

  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    const method = req.method ?? "GET";

    try {
      if (options.authenticate) {
        const authed = await options.authenticate(req);
        if (authed !== true) {
          sendJson(res, 401, { error: "Unauthorized" });
          return;
        }
      }

      if (method === "GET" && pathname === "/health") {
        const body: HealthResponse = {
          status: "ok",
          rulesLoaded: engine.getRules().length,
          uptime: Date.now() - startTime,
        };
        sendJson(res, 200, body);
        return;
      }

      if (method === "GET" && pathname === "/rules") {
        const rules = engine.getRules().map((r) => ({
          id: r.id,
          effect: r.effect,
          roles: r.roles,
          actions: r.actions,
          resources: r.resources,
          priority: r.priority,
          description: r.description,
          hasConditions: (r.conditions?.length ?? 0) > 0,
        }));
        sendJson(res, 200, { rules });
        return;
      }

      if (method === "POST" && pathname === "/evaluate") {
        let raw: string;
        try {
          raw = await readBody(req, maxBodyBytes);
        } catch (err) {
          sendJson(res, 413, {
            error: err instanceof Error ? err.message : "Payload too large",
          });
          return;
        }

        let body: EvalRequestBody;
        try {
          body = JSON.parse(raw);
        } catch {
          sendJson(res, 400, { error: "Invalid JSON body" });
          return;
        }

        if (!body.subject || !body.action || !body.resource) {
          sendJson(res, 400, {
            error: "Missing required fields: subject, action, resource",
          });
          return;
        }

        if (typeof body.action !== "string" || typeof body.resource !== "string") {
          sendJson(res, 400, { error: "action and resource must be strings" });
          return;
        }

        if (
          typeof body.subject !== "object" ||
          typeof body.subject.id !== "string" ||
          !Array.isArray(body.subject.roles)
        ) {
          sendJson(res, 400, {
            error: "subject must have a string id and a roles array",
          });
          return;
        }

        const subject: Subject<S> = options.resolveSubject
          ? await options.resolveSubject(body)
          : (body.subject as unknown as Subject<S>);

        const decision = engine.evaluate(
          subject,
          body.action as Parameters<typeof engine.evaluate>[1],
          body.resource as Parameters<typeof engine.evaluate>[2],
          body.resourceContext ?? {},
          body.tenantId,
        );

        const response: EvalResponseBody = {
          allowed: decision.allowed,
          effect: decision.effect,
          reason: decision.reason,
          matchedRuleId: decision.matchedRule?.id ?? null,
          durationMs: decision.durationMs,
        };
        sendJson(res, 200, response);
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      sendJson(res, 500, { error: message });
    }
  });

  return {
    start(): Promise<void> {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          resolve();
        });
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },

    httpServer: server,
  };
}
