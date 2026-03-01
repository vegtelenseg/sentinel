import type { AccessEngine } from "../engine.js";
import type { SchemaDefinition, InferAction, InferResource, Subject, ResourceContext } from "../types.js";

/**
 * Minimal Hono-compatible types so we don't depend on hono at runtime.
 */
interface HonoContext {
  req: {
    raw: Request;
    header(name: string): string | undefined;
    param(name: string): string | undefined;
    [key: string]: unknown;
  };
  json(data: unknown, status?: number): Response;
  get<T = unknown>(key: string): T;
  set(key: string, value: unknown): void;
  [key: string]: unknown;
}

type HonoNext = () => Promise<void>;
type HonoMiddleware = (c: HonoContext, next: HonoNext) => Promise<Response | void>;

export interface HonoGuardOptions<S extends SchemaDefinition> {
  /** Extract the subject from the Hono context. */
  getSubject: (c: HonoContext) => Subject<S> | undefined;
  /** Extract the resource context from the Hono context (optional). */
  getResourceContext?: (c: HonoContext) => ResourceContext;
  /** Extract the tenant ID from the Hono context (optional). */
  getTenantId?: (c: HonoContext) => string | undefined;
  /** Custom denial handler. Return a Response to override the default 403. */
  onDenied?: (c: HonoContext) => Response;
}

/**
 * Hono middleware factory.
 *
 * Usage:
 *   app.post(
 *     "/invoices/:id/approve",
 *     honoGuard(engine, "invoice:approve", "invoice", {
 *       getSubject: (c) => c.get("user"),
 *       getTenantId: (c) => c.req.header("x-tenant-id"),
 *     }),
 *     handler,
 *   );
 */
export function honoGuard<S extends SchemaDefinition>(
  engine: AccessEngine<S>,
  action: InferAction<S>,
  resource: InferResource<S>,
  options: HonoGuardOptions<S>,
): HonoMiddleware {
  return async (c: HonoContext, next: HonoNext) => {
    const subject = options.getSubject(c);
    if (!subject) {
      return c.json({ error: "Unauthorized — no subject" }, 401);
    }

    let decision;
    try {
      const resourceContext = options.getResourceContext?.(c) ?? {};
      const tenantId = options.getTenantId?.(c);
      decision = engine.evaluate(subject, action, resource, resourceContext, tenantId);
    } catch {
      return c.json({ error: "Internal authorization error" }, 500);
    }

    if (decision.allowed) {
      await next();
      return;
    }

    if (options.onDenied) {
      return options.onDenied(c);
    }

    return c.json({
      error: "Forbidden",
      reason: decision.reason,
    }, 403);
  };
}
