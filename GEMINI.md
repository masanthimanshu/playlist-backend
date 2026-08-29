# Gemini / Antigravity Agent Guidelines

This repository is a TypeScript Serverless Backend built with Express 5, AWS Lambda, Serverless Framework v4, DynamoDB, S3/CloudFront, and Zod.

When generating or modifying code in this codebase within Antigravity IDE, strictly adhere to the following architecture, conventions, and rules.

---

## 1. Tech Stack & Architecture

- **Language & Runtime:** TypeScript (`NodeNext` ESM) running on Node.js 24 (`nodejs24.x`).
- **Framework:** Express 5 wrapped with `serverless-http` for AWS HTTP API Gateway.
- **Bundler:** Serverless Framework v4 native `esbuild` pipeline (targeting Node 24).
- **Validation:** Zod schemas with static type inference (`z.infer<typeof Schema>`).
- **Testing:** Vitest for native TypeScript unit and integration testing.
- **AWS SDK:** AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- **Custom Skills:** Project-specific skills located in `.agent/skills/` (`gemini-create`, `readme-create`, `summary-create`).

### Directory Structure

```
├── .agent/skills/                  # Antigravity custom skills
│   ├── gemini-create/SKILL.md      # Skill to generate/update GEMINI.md
│   ├── readme-create/SKILL.md      # Skill to generate comprehensive README.md
│   └── summary-create/SKILL.md     # Skill to generate resume technical summary
├── .github/workflows/
│   └── deploy-serverless.yaml      # CI/CD deployment workflow
├── aws/                            # CloudFormation extensions
│   ├── iam.yaml                    # IAM execution role statements (DynamoDB, S3)
│   └── resources.yaml              # CloudFormation resources (DynamoDB Table, S3, OAC, CloudFront)
├── core/                           # Core application factory & shared middleware
│   ├── create_app.ts               # Express application factory with CORS, JSON body & error handlers
│   ├── create_app.test.ts          # Unit tests for Express application factory
│   ├── validator.ts                # Zod validation middleware factory & CustomRequest interface
│   └── validator.test.ts           # Unit tests for validator middleware
├── modules/                        # Shared AWS client wrappers & system utilities
│   ├── dynamo_client.ts            # DynamoDB DocumentClient wrapper (CRUD operations)
│   ├── dynamo_client.test.ts       # Unit tests for DynamoDB client wrapper
│   ├── runtime_logs.ts             # Structured JSON logger (info, warn, error, debug)
│   ├── runtime_logs.test.ts        # Unit tests for structured logger
│   ├── s3_client.ts                # S3 presigned URL generator & CloudFront CDN URL resolver
│   └── s3_client.test.ts           # Unit tests for S3 client wrapper
├── src/                            # Domain modules (Modular Controller-Route-Handler-Schema pattern)
│   ├── storage/                    # Storage & upload URL generation domain
│   │   ├── controllers/
│   │   │   ├── controller.ts       # Storage domain controller
│   │   │   └── controller.test.ts  # Storage controller unit tests
│   │   ├── handler.ts              # Serverless Lambda handler export for /storage
│   │   ├── routes/
│   │   │   └── routes.ts           # Express router definitions for storage endpoints
│   │   └── schemas/
│   │       └── schema.ts           # Storage Zod validation schemas & TypeScript types
│   └── tracks/                     # Audio track CRUD domain
│       ├── controllers/
│       │   ├── controller.ts       # Tracks domain controller
│       │   └── controller.test.ts  # Tracks controller unit tests
│       ├── handler.ts              # Serverless Lambda handler export for /tracks
│       ├── routes/
│       │   └── routes.ts           # Express router definitions for tracks endpoints
│       └── schemas/
│           └── schema.ts           # Tracks Zod validation schemas & TypeScript types
├── package.json                    # Package manifest, ESM imports, dependencies & scripts
├── serverless.yaml                 # Serverless Framework v4 service configuration
├── tsconfig.json                   # TypeScript configuration (ES2022, NodeNext module resolution)
└── vitest.config.ts                # Vitest test runner configuration
```

---

## 2. Import Conventions & Path Aliases

Use Node ESM package imports for all internal dependencies:

- `#core/*` points to `./core/*`
- `#modules/*` points to `./modules/*`

> [!IMPORTANT]
> Because TypeScript uses `NodeNext` ESM module resolution, you **must** include the `.js` extension in all relative and path-aliased file imports:
>
> ```typescript
> // CORRECT: Includes .js extension
> import { logger } from "#modules/runtime_logs.js";
> import { validateData } from "#core/validator.js";
> import { tracksController } from "../controllers/controller.js";
>
> // INCORRECT: Missing .js extension (will cause runtime ESM import errors)
> import { logger } from "#modules/runtime_logs";
> import { validateData } from "#core/validator";
> import { tracksController } from "../controllers/controller";
> ```

---

## 3. Controller-Route-Handler-Schema Pattern

Every domain module in `src/<domain>/` must adhere to the 4-layer modular pattern:

1. **Schemas (`schemas/schema.ts`):** Define Zod schemas and infer TypeScript types for inputs, outputs, and database entity models.
2. **Controllers (`controllers/controller.ts`):** Contain business logic, invoke client wrappers, return explicit HTTP status codes, and emit structured logs.
3. **Routes (`routes/routes.ts`):** Map HTTP verbs/paths to controller methods, attaching `validateData(Schema)` middleware to endpoints requiring validation.
4. **Handlers (`handler.ts`):** Instantiate the Express app via `createApp("/<domain>", router)` and wrap with `serverless(app)`.

### Canonical Implementation Example

#### 1. Schema (`src/<domain>/schemas/schema.ts`)

```typescript
import { z } from "zod";

export const CreateItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;

export interface ItemEntity extends Record<string, unknown> {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
}
```

#### 2. Controller (`src/<domain>/controllers/controller.ts`)

```typescript
import type { Request, Response } from "express";
import { logger } from "#modules/runtime_logs.js";
import { writeData, getData } from "#modules/dynamo_client.js";
import type { CreateItemInput, ItemEntity } from "../schemas/schema.js";

export const domainController = {
  healthCheck(req: Request, res: Response): Response {
    logger.info("Health check requested", { path: req.path });
    return res.status(200).json({
      status: "ok",
      service: "example-domain",
      timestamp: new Date().toISOString(),
    });
  },

  async getItem(req: Request, res: Response): Promise<Response> {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "Item ID is required" });
    }

    try {
      const item = await getData<ItemEntity>(Array.isArray(id) ? id[0] : id);
      if (!item) {
        logger.warn("Item not found", { id });
        return res.status(404).json({ error: "Item not found" });
      }
      return res.status(200).json(item);
    } catch (err: unknown) {
      logger.error("Failed to fetch item", { id, error: err });
      return res.status(500).json({ error: "Failed to retrieve item" });
    }
  },

  async createItem(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateItemInput;
      const created = await writeData<CreateItemInput>(payload);
      logger.info("Item created successfully", { id: created.id });
      return res.status(201).json(created);
    } catch (err: unknown) {
      logger.error("Failed to create item", { error: err });
      return res.status(500).json({ error: "Failed to create item" });
    }
  },
};
```

#### 3. Route (`src/<domain>/routes/routes.ts`)

```typescript
import { Router } from "express";
import { validateData } from "#core/validator.js";
import { domainController } from "../controllers/controller.js";
import { CreateItemSchema } from "../schemas/schema.js";

const router = Router();

router.get("/health", (req, res) => domainController.healthCheck(req, res));
router.get("/:id", (req, res) => void domainController.getItem(req, res));
router.post(
  "/create",
  validateData(CreateItemSchema),
  (req, res) => void domainController.createItem(req, res),
);

export default router;
```

#### 4. Handler (`src/<domain>/handler.ts`)

```typescript
import serverless from "serverless-http";
import createApp from "#core/create_app.js";
import router from "./routes/routes.js";

const app = createApp("/<domain>", router);

export const handler = serverless(app);
```

---

## 4. Coding Guidelines & Guardrails

### Request Validation & Typing

- Always define request schemas using `zod`.
- Use the `validateData(schema)` middleware on routes for validating payloads (supports JSON body on POST/PUT and query parameters on GET/DELETE).
- Extract validated data via `req.body`, `req.query`, or type-safe `(req as CustomRequest<T>).validated`.
- On validation failure, the middleware returns HTTP 400 with `{ error: "Validation failed", details: [...] }`.

### Logging Standards

- **Never** use raw `console.log()` in domain controllers, utilities, or services.
- Always use the structured logger: `logger.info(msg, data)`, `logger.warn(msg, data)`, `logger.error(msg, data)`, `logger.debug(msg, data)`.
- Pass errors as an object or under `{ error: err }` so that Error names, messages, and stack traces are serialized cleanly into structured JSON.

### Error Handling & Response Format

- Return standardized JSON responses with explicit HTTP status codes:
  - `200 OK`: Successful retrieval or update (`res.status(200).json(data)`).
  - `201 Created`: Successful resource creation (`res.status(201).json(created)`).
  - `400 Bad Request`: Validation failure or missing input (`res.status(400).json({ error: "..." })`).
  - `404 Not Found`: Resource does not exist (`res.status(404).json({ error: "..." })`).
  - `500 Internal Server Error`: Unexpected exception or database/S3 failure (`res.status(500).json({ error: "..." })`).
- Always wrap asynchronous controller logic in `try ... catch` blocks and log failures with `logger.error()`.

### Environment Variables & Cloud Infrastructure Sync

- Environment variables are defined in `serverless.yaml` under `provider.environment`:
  - `CURRENT_AWS_REGION`: AWS region (default `ap-south-1`).
  - `TABLE_NAME`: Primary DynamoDB table (`playlist-backend-data-table`).
  - `BUCKET_NAME`: S3 assets bucket (`playlist-backend-assets-bucket`).
  - `CLOUDFRONT_DOMAIN`: Optional CDN domain for resolving asset URLs.
- When introducing new AWS operations or resources:
  - Add required IAM permissions to `aws/iam.yaml`.
  - Define CloudFormation resource specifications in `aws/resources.yaml`.
  - Expose any new environment variables in `serverless.yaml`.

### Testing Standards

- Write unit tests alongside controllers and middleware using the `*.test.ts` naming convention.
- Use `vitest` for running test suites.
- Use `vi.mock(...)` to mock AWS SDK clients (`#modules/dynamo_client.js`, `#modules/s3_client.js`, `#modules/runtime_logs.js`) and prevent real AWS network calls in tests.
- Always verify all test suites pass before completing tasks.

---

## 5. Verification Workflow

Before completing any task or pull request, execute the following verification steps in order:

1. **Typecheck:**

   ```bash
   npm run typecheck
   ```

   Ensures 0 TypeScript compiler errors (`tsc --noEmit`).

2. **Run Tests:**

   ```bash
   npm test
   ```

   Runs all Vitest unit and integration test suites.

3. **Verify Local Runtime (Dev Server):**
   ```bash
   npm run dev
   ```
   Starts `serverless-offline` with hot reloading (`serverless offline start --reloadHandler`) to verify HTTP endpoints locally.
