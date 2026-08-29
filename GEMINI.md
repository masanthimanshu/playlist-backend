# Gemini / Antigravity Agent Guidelines

This repository is a TypeScript Serverless Backend built with Express 5, AWS Lambda, Serverless Framework v4, and Zod.

When generating or modifying code in this codebase within Antigravity IDE, strictly adhere to the following architecture, conventions, and rules.

---

## 1. Tech Stack & Architecture

- **Language & Runtime:** TypeScript (`NodeNext` ESM) running on Node.js 24 (`nodejs24.x`).
- **Framework:** Express 5 wrapped with `serverless-http` for AWS HTTP API Gateway.
- **Bundler:** Serverless Framework v4 native `esbuild` pipeline.
- **Validation:** Zod schemas with static type inference.
- **Testing:** Vitest for fast, native TypeScript unit & integration tests.
- **AWS SDK:** AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- **Custom Skills:** Project includes custom skills in `.agent/skills/` (`gemini-create`, `readme-create`, `summary-create`).

### Directory Structure

```
├── .agent/skills/          # Antigravity custom skills (gemini-create, readme-create, summary-create)
├── .github/workflows/      # GitHub Actions CI/CD workflows
├── aws/                    # CloudFormation extensions
│   ├── iam.yaml            # IAM statements for the Lambda execution role
│   └── resources.yaml      # Custom AWS CloudFormation resources (DynamoDB, S3)
├── core/                   # Core application bootstrap and shared middleware
│   ├── create_app.ts       # Express application factory & global error handlers
│   ├── validator.ts        # Zod validation middleware factory
│   └── validator.test.ts   # Unit tests for validator middleware
├── modules/                # Shared AWS client wrappers & system utilities
│   ├── runtime_logs.ts     # Structured JSON logger
│   ├── dynamo_client.ts    # DynamoDB DocumentClient wrapper (CRUD operations)
│   ├── dynamo_client.test.ts # Unit tests for DynamoDB client
│   ├── s3_client.ts        # S3 presigned URL generator & CDN resolver
│   └── s3_client.test.ts   # Unit tests for S3 client wrapper
├── src/                    # Domain modules (Modular Controller-Route-Handler-Schema pattern)
│   ├── storage/            # Storage domain folder
│   │   ├── controllers/    # Domain controller functions & unit tests
│   │   │   ├── controller.ts
│   │   │   └── controller.test.ts
│   │   ├── handlers/       # Serverless Lambda handler export
│   │   │   └── handler.ts
│   │   ├── routes/         # Express router definitions
│   │   │   └── routes.ts
│   │   └── schemas/        # Zod validation schemas & TypeScript types
│   │       └── schema.ts
│   └── tracks/             # Tracks domain folder
│       ├── controllers/    # Domain controller functions & unit tests
│       │   ├── controller.ts
│       │   └── controller.test.ts
│       ├── handlers/       # Serverless Lambda handler export
│       │   └── handler.ts
│       ├── routes/         # Express router definitions
│       │   └── routes.ts
│       └── schemas/        # Zod validation schemas & TypeScript types
│           └── schema.ts
├── serverless.yaml         # Serverless Framework configuration
├── tsconfig.json           # TypeScript configuration
└── vitest.config.ts        # Vitest test runner configuration
```

---

## 2. Import Conventions & Path Aliases

Use Node ESM package imports for internal dependencies:

- `#core/*` points to `./core/*`
- `#modules/*` points to `./modules/*`

> [!IMPORTANT]
> Because TypeScript uses `NodeNext` ESM module resolution, always specify the `.js` extension in import specifiers:
>
> ```typescript
> import { logger } from "#modules/runtime_logs.js";
> import { validateData } from "#core/validator.js";
> ```

---

## 3. Controller-Route-Handler-Schema Pattern

Every domain in `src/<domain>/` must follow the modular structure:

1. **Schemas (`schemas/schema.ts`):** Zod schemas and inferred TypeScript types for request/response payloads.
2. **Controllers (`controllers/controller.ts`):** Business logic with explicit HTTP status codes, structured logging, and try/catch blocks.
3. **Routes (`routes/routes.ts`):** Route mapping with `validateData` middleware attached to mutating endpoints.
4. **Handlers (`handlers/handler.ts`):** Express app instantiation wrapped with `serverless(app)`.

### Example Implementation Pattern

```typescript
// src/<domain>/controllers/controller.ts
import type { Request, Response } from "express";
import { logger } from "#modules/runtime_logs.js";

export const domainController = {
  healthCheck(req: Request, res: Response): Response {
    logger.info("Health check requested", { path: req.path });
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  },

  async createItem(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body;
      // Domain logic here...
      return res.status(201).json(payload);
    } catch (err: unknown) {
      logger.error("Failed to create item", {
        error: err instanceof Error ? err.message : String(err),
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
};
```

```typescript
// src/<domain>/routes/routes.ts
import { Router } from "express";
import { domainController } from "../controllers/controller.js";
import { validateData } from "#core/validator.js";
import { CreateItemSchema } from "../schemas/schema.js";

const router = Router();

router.get("/health", (req, res) => domainController.healthCheck(req, res));
router.post("/", validateData(CreateItemSchema), (req, res) =>
  domainController.createItem(req, res),
);

export default router;
```

```typescript
// src/<domain>/handlers/handler.ts
import serverless from "serverless-http";
import createApp from "#core/create_app.js";
import router from "../routes/routes.js";

const app = createApp("/<domain>", router);

export const handler = serverless(app);
```

---

## 4. Coding Guidelines & Guardrails

### Request Validation & Error Handling

- Define request schemas using `zod`.
- Use the `validateData(schema)` middleware on routes.
- Access validated data via `req.validated` or `req.body`.
- Return standardized JSON responses (`res.status(200).json(...)`, `res.status(400).json({ error: ... })`, `res.status(404).json({ error: ... })`, `res.status(500).json({ error: ... })`).

### Logging

- Never use raw `console.log()`.
- Always use structured logging: `logger.info(msg, data)`, `logger.warn(...)`, `logger.error(...)`, `logger.debug(...)`.
- Pass `error` objects or error strings under the `error` property so stack traces serialize cleanly.

### Environment Variables & Infrastructure Sync

- Standard environment variables configured in `serverless.yaml`:
  - `CURRENT_AWS_REGION`: AWS region (e.g. `ap-south-1`).
  - `TABLE_NAME`: Primary DynamoDB table name (`playlist-backend-data-table`).
  - `BUCKET_NAME`: S3 assets bucket (`playlist-backend-assets-bucket`).
  - `CLOUDFRONT_DOMAIN`: Optional CDN domain for resolving asset URLs.
- When adding new AWS operations, add matching IAM permissions in `aws/iam.yaml` and CloudFormation resources in `aws/resources.yaml`.
- Define any new environment variables in `serverless.yaml` under `provider.environment`.

### Testing

- Write unit tests alongside your controllers and middleware using `*.test.ts` naming convention.
- Use `vitest` with `vi.mock(...)` or `vi.spyOn(...)` for mocking AWS clients, Express Request/Response objects, and handlers.
- Ensure all tests pass before concluding tasks.

---

## 5. Verification Workflow

Before completing any task, verify that your changes are error-free:

1. **Typecheck:** Run `npm run typecheck` (`tsc --noEmit`) to ensure 0 TypeScript compiler errors.
2. **Test:** Run `npm test` (`vitest run`) to verify all unit and integration tests pass.
3. **Local Dev:** Run `npm run dev` (`serverless offline start --reloadHandler`) to verify runtime behavior.
