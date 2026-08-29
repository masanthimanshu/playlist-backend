# Playlist Backend API

A high-performance, decoupled serverless TypeScript backend for the Playlist web application built with Express 5, AWS Lambda, Serverless Framework v4, Amazon DynamoDB, Amazon S3, and Amazon CloudFront.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-Serverless-FF9900?logo=awslambda&logoColor=white)
![DynamoDB](https://img.shields.io/badge/Amazon%20DynamoDB-Database-4053D6?logo=amazondynamodb&logoColor=white)
![CloudFront](https://img.shields.io/badge/Amazon%20CloudFront-CDN-FF4F8B?logo=amazonwebservices&logoColor=white)

---

## Architecture & Decoupled Domains

The backend is cleanly decoupled into two dedicated domains:

1. **Storage Domain (`src/storage/`)**:
   - Manages S3 presigned PUT URL generation for thumbnail cover images (`.png`) and audio tracks (`.mp3`).
   - Resolves target CloudFront CDN URLs.
   - Handles storage microservice health checks (`GET /storage/health`).

2. **Tracks Domain (`src/tracks/`)**:
   - Pure DynamoDB persistence layer.
   - Pushes track metadata to DynamoDB and fetches track listings for the frontend.
   - Handles tracks microservice health checks (`GET /tracks/health`).

---

## REST Endpoints Reference

### Data Model

```json
{
  "id": "c1f7a28e-3994-4d89-8d75-685b85a3a7f1",
  "title": "Midnight Drive",
  "artist": ["Luna Echo", "Kavinsky"],
  "category": "Synthwave",
  "audioUrl": "https://d12345678.cloudfront.net/audio/xyz.mp3",
  "coverUrl": "https://d12345678.cloudfront.net/covers/abc.png",
  "timestamp": "2026-08-29T12:00:00.000Z"
}
```

### Endpoints

| Domain | Method | Route | Description | Request Body |
|---|---|---|---|---|
| **Storage** | `GET` | `/storage/health` | Storage health check | None |
| **Storage** | `POST` | `/storage/upload-url` | Generate S3 presigned PUT URL & CDN URL | `{ "type": "audio" \| "cover", "contentType"?: string }` |
| **Tracks** | `GET` | `/tracks/health` | Tracks health check | None |
| **Tracks** | `GET` | `/tracks/get-tracks` | Fetch all tracks from DynamoDB | None |
| **Tracks** | `GET` | `/tracks/:id` | Fetch a single track from DynamoDB | None |
| **Tracks** | `POST` | `/tracks/create-track` | Push new track to DynamoDB | `{ "title": string, "artist": string[], "category": string, "audioUrl": string, "coverUrl": string }` |
| **Tracks** | `DELETE` | `/tracks/:id` | Delete track from DynamoDB | None |

---

## Getting Started

### Prerequisites

- **Node.js** v24+
- **npm** v10+
- **AWS CLI** configured (for cloud deployment)

### Installation

```bash
npm install
```

### Local Development

Start the local serverless offline development server:

```bash
npm run dev
```

The API will be available locally at `http://localhost:3000`.

### Type Checking & Testing

```bash
# Run TypeScript compilation check
npm run typecheck

# Run Vitest test suite
npm test
```

### Deployment

Deploy to AWS using Serverless Framework:

```bash
npm run deploy
```

---

## Project Structure

```
├── aws/
│   ├── iam.yaml              # Lambda IAM roles & permissions
│   └── resources.yaml        # DynamoDB, S3 bucket, CloudFront OAC & Distribution
├── core/
│   ├── create_app.ts         # Express app factory with CORS & error handlers
│   └── validator.ts          # Zod validation middleware
├── modules/
│   ├── dynamo_client.ts      # DynamoDB DocumentClient wrapper (CRUD)
│   ├── runtime_logs.ts       # Structured JSON logger
│   └── s3_client.ts          # S3 presigned URLs & CloudFront CDN resolver
├── src/
│   ├── storage/              # S3 Presigned URL generation & health domain
│   │   ├── controllers/      # Controller functions & tests
│   │   ├── handlers/         # Lambda handler entrypoint
│   │   ├── routes/           # Express route definitions
│   │   └── schemas/          # Zod validation schemas & types
│   └── tracks/               # DynamoDB track metadata persistence domain
│       ├── controllers/      # Controller functions & tests
│       ├── handlers/         # Lambda handler entrypoint
│       ├── routes/           # Express route definitions
│       └── schemas/          # Zod validation schemas & types
├── serverless.yaml           # Serverless Framework configuration
└── tsconfig.json             # TypeScript NodeNext ESM configuration
```

---

## License

Distributed under the ISC License.
