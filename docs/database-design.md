# Database Design

## Concurrency in SQLite
Since SQLite does not support `FOR UPDATE SKIP LOCKED`, we implement atomic claiming using isolated transactions (`BEGIN IMMEDIATE`). This guarantees that concurrent workers do not claim the same job, leveraging SQLite's Write-Ahead Logging (WAL) and busy timeout features to handle concurrent load.

## Indexes and Query Patterns
1. **`jobs` table index `(queueId, status, runAt)`**: This is the hot path for the Worker poller to quickly find the next eligible job to run without a full table scan.
2. **`workers` table index `(lastHeartbeatAt)`**: Used by the Dead Worker Reaper to quickly identify stale workers.
3. **`scheduled_jobs` table index `(nextRunAt, isActive)`**: Scanned by the Scheduler Tick to materialize recurring jobs.
