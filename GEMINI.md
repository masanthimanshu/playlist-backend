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
- **AWS SDK:** AWS SDK v3 (`@aws-sdk/client-*`).
- **Custom Skills:** Project includes custom skills in `.agent/skills/` (`readme-create`, `summary-create`).

### Directory Structure

```
├── .agent/skills/          # Antigravity custom skills (readme-create, summary-create)
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
│   ├── dynamo_client.ts    # DynamoDB DocumentClient wrapper
│   ├── s3_client.ts        # S3 presigned URL generator
│   ├── bedrock_client.ts   # Bedrock Converse API LLM wrapper
│   ├── secrets_client.ts   # Secrets Manager client wrapper
│   └── parameter_store.ts  # SSM Parameter Store client wrapper
├── src/                    # Domain modules (Controller-Route-Handler pattern)
│   └── storage/            # Domain folder
│       ├── controller.ts   # Domain controller functions
│       ├── controller.test.ts # Unit tests for controller logic
│       ├── handler.ts      # Serverless Lambda handler export
│       └── routes.ts       # Express router definitions
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

## 3. Controller-Route-Service Pattern

Keep route files clean and delegate business logic to domain controllers:

```typescript
// src/<domain>/controller.ts
import type { Request, Response } from "express";
import { logger } from "#modules/runtime_logs.js";

export const storageController = {
  healthCheck(req: Request, res: Response): Response {
    logger.info("Health check requested", { path: req.path });
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  },

  // Add domain controller methods here (e.g. createItem, getItem)
};
```

```typescript
// src/<domain>/routes.ts
import { Router } from "express";
import { storageController } from "./controller.js";

const router = Router();

router.get("/health", (req, res) => storageController.healthCheck(req, res));

export default router;
```

---

## 4. Coding Guidelines & Guardrails

### Request Validation

- Define request schemas using `zod`.
- Use the `validateData(schema)` middleware on routes.
- Access validated data via `req.validated` or `req.body`.

### Logging

- Never use raw `console.log()`.
- Always use structured logging: `logger.info(msg, data)`, `logger.warn(...)`, `logger.error(...)`.
- Pass `error` objects under the `error` property so stack traces serialize cleanly.

### AWS Permissions & Infrastructure Sync
- When adding new AWS operations, add matching IAM permissions in `aws/iam.yaml`.
- Define any environment variables in `serverless.yaml` under `provider.environment`.

### Testing
- Write unit tests alongside your controllers and middleware using `*.test.ts` naming convention.
- Use `vitest` for mocking AWS clients, Express Request/Response objects, and handlers.
- Ensure all tests pass before concluding tasks.

---

## 5. Verification Workflow

Before completing any task, verify that your changes are error-free:

1. **Typecheck:** Run `npm run typecheck` (`tsc --noEmit`) to ensure 0 TypeScript compiler errors.
2. **Test:** Run `npm test` (`vitest run`) to verify all unit and integration tests pass.
3. **Local Dev:** Run `npm run dev` (`serverless offline start --reloadHandler`) to verify runtime behavior.
