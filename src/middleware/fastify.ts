import type { AccessEngine } from "../engine.js";
import type { SchemaDefinition, InferAction, InferResource, Subject, ResourceContext } from "../types.js";

/**
 * Minimal Fastify-compatible types so we don't depend on fastify at runtime.
 */
interface FastifyRequest {
  [key: string]: unknown;
}
interface FastifyReply {
  code(statusCode: number): FastifyReply;
  send(payload?: unknown): FastifyReply;
}

export interface FastifyGuardOptions<S extends SchemaDefinition> {
  getSubject: (req: FastifyRequest) => Subject<S> | undefined;
  getResourceContext?: (req: FastifyRequest) => ResourceContext;
  getTenantId?: (req: FastifyRequest) => string | undefined;
  onDenied?: (req: FastifyRequest, reply: FastifyReply) => void;
}

/**
 * Fastify preHandler hook factory.
 *
 * Usage:
 *   fastify.post("/invoices/:id/approve", {
 *     preHandler: fastifyGuard(engine, "invoice:approve", "invoice", opts),
 *   }, handler);
 */
export function fastifyGuard<S extends SchemaDefinition>(
  engine: AccessEngine<S>,
  action: InferAction<S>,
  resource: InferResource<S>,
  options: FastifyGuardOptions<S>,
) {
  return (req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) => {
    const subject = options.getSubject(req);
    if (!subject) {
      reply.code(401).send({ error: "Unauthorized — no subject" });
      return;
    }

    let decision;
    try {
      const resourceContext = options.getResourceContext?.(req) ?? {};
      const tenantId = options.getTenantId?.(req);
      decision = engine.evaluate(subject, action, resource, resourceContext, tenantId);
    } catch (err) {
      done(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    if (decision.allowed) {
      done();
    } else if (options.onDenied) {
      options.onDenied(req, reply);
      done();
    } else {
      reply.code(403).send({
        error: "Forbidden",
        reason: decision.reason,
      });
    }
  };
}
