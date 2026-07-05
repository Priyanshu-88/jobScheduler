# Design Decisions

## 1. SQLite over PostgreSQL/Redis
The user requested a setup that does not require Docker, PostgreSQL, or Redis. We opted for SQLite to run everything entirely locally using Node.js. 

**Trade-offs:**
- We lose `SKIP LOCKED` which is ideal for queue claiming. We worked around this using SQLite immediate transactions. Under high worker concurrency, SQLite lock contention (SQLITE_BUSY) can occur, but it is acceptable for this local setup.
- We lose Redis TTLs for worker heartbeats, replacing it with a database polling approach (`reaper.ts`).

## 2. Monorepo structure
We used NPM workspaces for a seamless developer experience to link the shared types and database models.

## 3. Plain HTML/JS Frontend
The user specifically requested a plain HTML/CSS/JS frontend. We avoided bundlers like Webpack or Vite, utilizing modern ES features, fetch, and CDNs for Chart.js and Socket.io.
