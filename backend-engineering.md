# Backend Engineering Overview

The backend of this **Job Scheduler Platform** is built using **NestJS**, **TypeScript**, and **Prisma ORM with SQLite**. It replicates the architecture of a production-grade, distributed queue system while prioritizing simplicity for local setup.

---

## 1. Concurrency and Distributed Job Claiming (The "Lock")
In a distributed environment, multiple workers poll the database for jobs. Without proper locking, two workers might pick up and execute the same job simultaneously.

* **The Engineering Solution**: We use an **atomic state transition** pattern.
* **How it works**: When a worker requests jobs, the backend runs a Prisma transaction that selects pending jobs and transitions their status from `queued` (or `scheduled` if the execution time is reached) to `claimed` in a single atomic update.
* **Query Optimization**: In the schema, we use a composite index on `(queue_id, status, run_at)` to ensure that picking up the next job requires a fast index scan instead of a full table scan.

---

## 2. Worker Lifecycle and Heartbeats
To prevent the system from getting blocked when a worker crashes mid-job, the backend tracks worker health.

* **Active Registration**: When a worker starts (`npm run dev:worker`), it registers itself in the `Worker` table with its current PID and host capabilities.
* **Heartbeats**: Every 5 seconds, the worker runs a background process updating its `lastHeartbeatAt` timestamp and current load.
* **Zombie Reaping**: If the API detects a worker whose last heartbeat is older than a set threshold (e.g., 15 seconds), it marks the worker as `dead` and automatically releases any `claimed`/`running` jobs back into the `queued` pool so other workers can process them.

---

## 3. Execution Reliability & Resilience

* **Retry Policies**: Jobs are bound to customizable retry policies (Fixed, Linear, Exponential Backoff with Jitter). If a job fails, the worker calculates the backoff delay, increments the `attemptCount`, and reschedules the job (`runAt = now + delay`).
* **Dead Letter Queue (DLQ)**: If a job exhausts its `maxAttempts`, it is automatically moved to the `DeadLetterJob` table. This isolates failing payloads, preventing them from clogging the active processing pipelines, and allows developers to inspect errors and manually replay jobs via the API (`POST /jobs/:id/replay`).

---

## 4. Modular NestJS Architecture
The codebase is clean, maintainable, and structured using clean-architecture principles:

* **Controllers**: Expose REST endpoints with automatic OpenAPI/Swagger documentation.
* **Services**: Contain the business logic for queue routing, delay estimation, and access validation.
* **Guards & Interceptors**: Protect resources via JWT verification and automatically format API payloads into unified, clean JSON responses using a global response interceptor.
