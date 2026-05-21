# NestJS

[← Documentation home](/)

```typescript
import {
  createAuthorizeDecorator,
  createAuthGuard,
} from "@siremzam/sentinel/middleware/nestjs";

const Authorize = createAuthorizeDecorator<AppSchema>();

const AuthGuard = createAuthGuard<AppSchema>({
  engine,
  getSubject: (req) => req.user as Subject<AppSchema>,
  getTenantId: (req) => req.headers["x-tenant-id"] as string,
});

@Controller("invoices")
class InvoiceController {
  @Post(":id/approve")
  @Authorize("invoice:approve", "invoice")
  approve(@Param("id") id: string) {
    return { approved: true };
  }
}

app.useGlobalGuards(new AuthGuard());
```

No dependency on `@nestjs/common` metadata beyond what your app already uses. Metadata is stored in a WeakMap — no `reflect-metadata` requirement from Sentinel.
