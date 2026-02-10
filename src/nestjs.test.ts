import { describe, it, expect } from "vitest";
import { AccessEngine } from "./engine.js";
import { allow } from "./policy-builder.js";
import {
  createAuthorizeDecorator,
  createAuthGuard,
  getAuthorizeMetadata,
} from "./middleware/nestjs.js";
import type { SchemaDefinition, Subject } from "./types.js";

interface TestSchema extends SchemaDefinition {
  roles: "admin" | "member" | "viewer";
  resources: "invoice" | "project";
  actions: "invoice:create" | "invoice:read" | "invoice:approve" | "project:read";
}

const schema: TestSchema = {} as TestSchema;

describe("NestJS integration", () => {
  describe("createAuthorizeDecorator", () => {
    const Authorize = createAuthorizeDecorator<TestSchema>();

    it("stores metadata on the decorated method", () => {
      class TestController {
        @Authorize("invoice:approve", "invoice")
        approve() {
          return "approved";
        }
      }

      const controller = new TestController();
      const meta = getAuthorizeMetadata(controller.approve);
      expect(meta).toEqual({
        action: "invoice:approve",
        resource: "invoice",
      });
    });

    it("returns undefined for undecorated methods", () => {
      class TestController {
        list() {
          return "list";
        }
      }

      const controller = new TestController();
      expect(getAuthorizeMetadata(controller.list)).toBeUndefined();
    });
  });

  describe("createAuthGuard", () => {
    it("allows when subject has matching role", () => {
      const engine = new AccessEngine<TestSchema>({ schema });
      engine.addRule(
        allow<TestSchema>()
          .id("admin-all")
          .roles("admin")
          .anyAction()
          .anyResource()
          .build(),
      );

      const Authorize = createAuthorizeDecorator<TestSchema>();

      class TestController {
        @Authorize("invoice:approve", "invoice")
        approve() {
          return "approved";
        }
      }

      const controller = new TestController();

      const AuthGuard = createAuthGuard<TestSchema>({
        engine,
        getSubject: (req) => req["user"] as Subject<TestSchema>,
      });

      const guard = new AuthGuard();

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: "u1", roles: [{ role: "admin" }] },
          }),
          getResponse: () => ({}),
        }),
        getHandler: () => controller.approve,
        getClass: () => TestController,
      };

      expect(guard.canActivate(mockContext as never)).toBe(true);
    });

    it("denies when subject lacks the role", () => {
      const engine = new AccessEngine<TestSchema>({ schema });
      engine.addRule(
        allow<TestSchema>()
          .id("admin-all")
          .roles("admin")
          .anyAction()
          .anyResource()
          .build(),
      );

      const Authorize = createAuthorizeDecorator<TestSchema>();

      class TestController {
        @Authorize("invoice:approve", "invoice")
        approve() {
          return "approved";
        }
      }

      const controller = new TestController();

      const AuthGuard = createAuthGuard<TestSchema>({
        engine,
        getSubject: (req) => req["user"] as Subject<TestSchema>,
      });

      const guard = new AuthGuard();

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: "u2", roles: [{ role: "viewer" }] },
          }),
          getResponse: () => ({}),
        }),
        getHandler: () => controller.approve,
        getClass: () => TestController,
      };

      expect(guard.canActivate(mockContext as never)).toBe(false);
    });

    it("allows when no metadata is set (unprotected endpoint)", () => {
      const engine = new AccessEngine<TestSchema>({ schema });

      const AuthGuard = createAuthGuard<TestSchema>({
        engine,
        getSubject: (req) => req["user"] as Subject<TestSchema>,
      });

      const guard = new AuthGuard();

      class UnprotectedController {
        health() {
          return "ok";
        }
      }

      const controller = new UnprotectedController();

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({}),
          getResponse: () => ({}),
        }),
        getHandler: () => controller.health,
        getClass: () => UnprotectedController,
      };

      expect(guard.canActivate(mockContext as never)).toBe(true);
    });

    it("denies when subject is missing from request", () => {
      const engine = new AccessEngine<TestSchema>({ schema });
      engine.addRule(
        allow<TestSchema>().id("r1").roles("admin").anyAction().anyResource().build(),
      );

      const Authorize = createAuthorizeDecorator<TestSchema>();

      class TestController {
        @Authorize("invoice:read", "invoice")
        read() {
          return "data";
        }
      }

      const controller = new TestController();

      const AuthGuard = createAuthGuard<TestSchema>({
        engine,
        getSubject: () => undefined,
      });

      const guard = new AuthGuard();

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({}),
          getResponse: () => ({}),
        }),
        getHandler: () => controller.read,
        getClass: () => TestController,
      };

      expect(guard.canActivate(mockContext as never)).toBe(false);
    });
  });
});
