# Design Decisions & Trade-Offs

This document outlines the major architectural and design decisions made while building the Job Scheduler platform, highlighting the trade-offs considered.

## 1. Database: SQLite vs. PostgreSQL/Redis
**Decision**: We chose SQLite via Prisma for the primary data store.
**Trade-Offs**:
- *Pros*: Extreme simplicity of setup. No external dependencies (no Redis container, no Postgres container needed). Data resides locally in `dev.db`, making it incredibly easy for developers to clone, install, and run.
- *Cons*: SQLite does not support true high-concurrency writes well, and it lacks some advanced locking features like Postgres' `SELECT ... FOR UPDATE SKIP LOCKED`. 
- *Mitigation*: We simulated a distributed lock using Prisma transactions and an atomic `updateMany` approach where workers claim jobs by transitioning them from `queued` to `claimed` atomically based on `runAt` timestamps.

## 2. Worker Fleet Management: Heartbeats vs. Persistent TCP
**Decision**: Workers manage their presence via a "Heartbeat" mechanism, writing to a `WorkerHeartbeat` table every 5 seconds.
**Trade-Offs**:
- *Pros*: Completely stateless API. We do not have to manage complex long-lived TCP/WebSocket connections from the workers. If an API server goes down, the workers simply reconnect and keep polling the database directly.
- *Cons*: Causes higher baseline database write-load, even when the system is idle.
- *Future Consideration*: Moving to a pub/sub model (via Redis or RabbitMQ) would reduce polling overhead but introduce infrastructure complexity.

## 3. Dashboard Real-time Updates: Polling vs. WebSockets
**Decision**: The Dashboard UI uses short-polling (every 5 seconds) to fetch real-time overview metrics and refresh table data.
**Trade-Offs**:
- *Pros*: Massively simplifies the frontend state management. No complex WebSocket reconnection logic, no handling of lost events, and easy integration with the existing REST endpoints.
- *Cons*: Network overhead. It sends requests every 5 seconds regardless of whether data has changed.
- *Mitigation*: We implemented a global Event Bus (`data:changed`) in the frontend. Any mutation (e.g. creating a queue, submitting a job) triggers an instant refresh, making the UI feel highly responsive despite the 5-second baseline polling.

## 4. Frontend Stack: Plain HTML/JS vs. React/Next.js
**Decision**: The Dashboard is built entirely in Vanilla JS, HTML, and CSS.
**Trade-Offs**:
- *Pros*: Zero build step required. The dashboard is lightning fast to load and served directly by NestJS's `ServeStaticModule`. Developers don't need to run a separate Node server just for the frontend.
- *Cons*: Lacks component reusability. DOM manipulation can become verbose (e.g. `document.getElementById('...').innerHTML = ...`).
- *Mitigation*: The UI was built with a highly structured CSS framework (using CSS variables) and organized JS functions to mimic component-based architecture where possible.

## 5. Mono-repo Architecture
**Decision**: The project is structured as a monorepo (`apps/api`, `apps/web`, `packages/shared`, `packages/database`).
**Trade-Offs**:
- *Pros*: Shared TypeScript interfaces (`@job-scheduler/shared`) ensure type safety across the backend and potentially frontend (if we used TS there). Centralized `package.json` makes dependency management uniform.
- *Cons*: Can be slightly more complex to deploy (requires deploying the `api` app and ensuring it can read the built `web` folder).
