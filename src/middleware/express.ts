import type { AccessEngine } from "../engine.js";
import type { SchemaDefinition, InferAction, InferResource, Subject, ResourceContext } from "../types.js";

/**
 * Minimal Express-compatible types so we don't depend on @types/express at runtime.
 */
interface Request {
  [key: string]: unknown;
}
interface Response {
  status(code: number): Response;
  json(body: unknown): void;
}
type NextFunction = (err?: unknown) => void;

export interface GuardOptions<S extends SchemaDefinition> {
  /** Extract the subject from the request. */
  getSubject: (req: Request) => Subject<S> | undefined;
  /** Extract the resource context from the request (optional). */
  getResourceContext?: (req: Request) => ResourceContext;
  /** Extract the tenant ID from the request (optional). */
  getTenantId?: (req: Request) => string | undefined;
  /** Custom denial handler. Defaults to 403 JSON response. */
  onDenied?: (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Express middleware factory.
 *
 * Usage:
 *   app.post("/invoices/:id/approve",
 *     guard(engine, "invoice:approve", "invoice", guardOptions),
 *     handler
 *   );
 */
export function guard<S extends SchemaDefinition>(
  engine: AccessEngine<S>,
  action: InferAction<S>,
  resource: InferResource<S>,
  options: GuardOptions<S>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const subject = options.getSubject(req);
    if (!subject) {
      res.status(401).json({ error: "Unauthorized — no subject" });
      return;
    }

    let decision;
    try {
      const resourceContext = options.getResourceContext?.(req) ?? {};
      const tenantId = options.getTenantId?.(req);
      decision = engine.evaluate(subject, action, resource, resourceContext, tenantId);
    } catch (err) {
      next(err);
      return;
    }

    if (decision.allowed) {
      next();
    } else if (options.onDenied) {
      options.onDenied(req, res, next);
    } else {
      res.status(403).json({
        error: "Forbidden",
        reason: decision.reason,
      });
    }
  };
}
