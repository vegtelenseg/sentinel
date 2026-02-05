import type { AccessEngine } from "../engine.js";
import type { SchemaDefinition, InferAction, InferResource, Subject, ResourceContext } from "../types.js";

/**
 * NestJS-compatible guard and decorator factory.
 *
 * Since we don't want a hard dependency on @nestjs/common or reflect-metadata,
 * this module uses a WeakMap to store metadata and provides factory functions
 * that produce NestJS-shaped guards and decorators.
 */

// ---------------------------------------------------------------------------
// Minimal NestJS interfaces (avoids @nestjs/common dependency)
// ---------------------------------------------------------------------------

interface ExecutionContext {
  switchToHttp(): {
    getRequest(): Record<string, unknown>;
    getResponse(): Record<string, unknown>;
  };
  getHandler(): (...args: unknown[]) => unknown;
  getClass(): new (...args: unknown[]) => unknown;
}

interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Metadata storage (no reflect-metadata needed)
// ---------------------------------------------------------------------------

export interface AuthorizeMetadata {
  action: string;
  resource: string;
}

const metadataStore = new WeakMap<object, AuthorizeMetadata>();

/**
 * Retrieve stored authorization metadata for a handler or class.
 */
export function getAuthorizeMetadata(
  ...targets: object[]
): AuthorizeMetadata | undefined {
  for (const target of targets) {
    const meta = metadataStore.get(target);
    if (meta) return meta;
  }
  return undefined;
}

/**
 * Creates a method decorator that stores authorization metadata.
 *
 * Usage in a NestJS controller:
 * ```ts
 * const Authorize = createAuthorizeDecorator<MySchema>();
 *
 * @Controller("invoices")
 * class InvoiceController {
 *   @Post(":id/approve")
 *   @Authorize("invoice:approve", "invoice")
 *   approve(@Param("id") id: string) { ... }
 * }
 * ```
 */
export function createAuthorizeDecorator<S extends SchemaDefinition>() {
  return function Authorize(
    action: InferAction<S>,
    resource: InferResource<S>,
  ): MethodDecorator {
    return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
      if (!descriptor?.value) return descriptor;
      const metadata: AuthorizeMetadata = {
        action: action as string,
        resource: resource as string,
      };
      metadataStore.set(descriptor.value as object, metadata);
      return descriptor;
    };
  };
}

// ---------------------------------------------------------------------------
// Guard factory
// ---------------------------------------------------------------------------

export interface NestGuardOptions<S extends SchemaDefinition> {
  engine: AccessEngine<S>;
  getSubject: (request: Record<string, unknown>) => Subject<S> | undefined;
  getResourceContext?: (request: Record<string, unknown>) => ResourceContext;
  getTenantId?: (request: Record<string, unknown>) => string | undefined;
}

/**
 * Creates a NestJS CanActivate guard class.
 *
 * Usage:
 * ```ts
 * const AuthGuard = createAuthGuard({
 *   engine,
 *   getSubject: (req) => req.user as Subject<MySchema>,
 * });
 *
 * // Use as a global guard:
 * app.useGlobalGuards(new AuthGuard());
 * ```
 */
export function createAuthGuard<S extends SchemaDefinition>(
  options: NestGuardOptions<S>,
): new () => CanActivate {
  const { engine, getSubject, getResourceContext, getTenantId } = options;

  class AccessControlGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const handler = context.getHandler();
      const cls = context.getClass();
      const metadata = getAuthorizeMetadata(handler, cls);

      if (!metadata) return true;

      const request = context.switchToHttp().getRequest();
      const subject = getSubject(request);
      if (!subject) return false;

      try {
        const resourceContext = getResourceContext?.(request) ?? {};
        const tenantId = getTenantId?.(request);

        const decision = engine.evaluate(
          subject,
          metadata.action as Parameters<typeof engine.evaluate>[1],
          metadata.resource as Parameters<typeof engine.evaluate>[2],
          resourceContext,
          tenantId,
        );

        return decision.allowed;
      } catch {
        return false;
      }
    }
  }

  return AccessControlGuard;
}
