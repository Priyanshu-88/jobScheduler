# API Documentation

The Job Scheduler provides a comprehensive RESTful API built with NestJS.

## Interactive Swagger UI

The best way to explore and interact with the API is through the auto-generated Swagger UI. 
Once you have the API server running (`npm run dev:api`), navigate your browser to:

👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

From there, you can view request payloads, response schemas, and execute API calls directly from your browser.

## Authentication

All endpoints (except `/auth/*`) are secured using JWT (JSON Web Tokens). 
When interacting programmatically, you must include the `Authorization` header:

```http
Authorization: Bearer <your_access_token>
```

You can obtain an access token by calling the login endpoint:
`POST /api/auth/login`
```json
{
  "email": "dev@jobscheduler.dev",
  "password": "password123"
}
```

## Response Envelope

All successful responses are wrapped in a standard envelope format via a global NestJS Interceptor:

```json
{
  "success": true,
  "data": { ... }, // Or an array [...]
  "meta": { ... } // Optional (e.g. pagination)
}
```

## Core Endpoints Overview

### Organizations & Projects
- `GET /api/organizations` - List your organizations
- `GET /api/projects` - List your projects
- `POST /api/projects` - Create a new project

### Queues
- `GET /api/queues?projectId={id}` - List queues for a project
- `POST /api/queues` - Create a queue (Immediate, Delayed, Scheduled)
- `POST /api/queues/:id/pause` - Pause a queue (halts job processing)
- `POST /api/queues/:id/resume` - Resume a paused queue

### Jobs
- `POST /api/jobs` - Submit a new job to a queue
- `GET /api/jobs` - List jobs (Supports `page`, `pageSize`, `queueId`, `status` filters)
- `GET /api/jobs/:id` - Get specific job details
- `POST /api/jobs/:id/replay` - Replay a failed job from the Dead Letter Queue

### Workers
- `GET /api/workers` - List active worker nodes and their current load capacity

## Pagination

Endpoints that return lists (like `/api/jobs`) support pagination via query parameters:
- `page` (default: 1)
- `pageSize` (default: 50, max: 100)

The response will include a `meta` object detailing the total records and pages.
