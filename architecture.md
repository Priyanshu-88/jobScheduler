# Architecture

The Job Scheduler platform is designed as a distributed, scalable system with distinct separation of concerns between the API tier, Worker tier, and the Frontend UI.

## High-Level Architecture Diagram

```mermaid
flowchart TD
    %% Define styles
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef api fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef worker fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef db fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    
    %% Components
    User[Client / Dashboard UI]:::client
    LoadBalancer[Reverse Proxy / Load Balancer]:::api
    
    subgraph API_Cluster [API Servers]
        API1(NestJS API Node 1):::api
        API2(NestJS API Node 2):::api
    end
    
    subgraph Worker_Cluster [Worker Nodes]
        Worker1(Worker Process 1):::worker
        Worker2(Worker Process 2):::worker
    end
    
    Database[(SQLite / Primary Database)]:::db
    
    %% Connections
    User -- HTTP/REST --> LoadBalancer
    User -- WebSockets --> LoadBalancer
    LoadBalancer --> API1
    LoadBalancer --> API2
    
    API1 -- Read/Write --> Database
    API2 -- Read/Write --> Database
    
    Worker1 -- Polling/Claiming --> Database
    Worker2 -- Polling/Claiming --> Database
    
    API1 -. Event Dispatch .-> Worker_Cluster
```

## Component Overview

### 1. Dashboard UI (Frontend)
A Single Page Application (SPA) built with pure HTML, CSS, and Vanilla JavaScript. It communicates with the API via REST endpoints. The UI polls the API to fetch real-time metrics, queue backlogs, and worker heartbeats.

### 2. NestJS API (Backend)
The core REST API built with NestJS. It handles:
- Authentication & Authorization (JWT-based).
- Project and Queue management.
- Job ingestion (Immediate, Delayed, Scheduled).
- Reporting and statistics (Job Throughput, Queue status).

### 3. Worker Processes
Standalone Node.js processes that continuously poll the database for `queued` or `scheduled` jobs that are ready to run. 
- Workers use transaction-level locking to **claim** jobs securely, preventing race conditions.
- They execute the jobs, handle retries based on the assigned `RetryPolicy`, and write execution logs.
- They emit heartbeats to the database every few seconds so the API can track active workers.

### 4. Database (SQLite via Prisma)
The central source of truth for the entire system. It stores user accounts, projects, queues, jobs, worker heartbeats, and logs. While SQLite is used for simplicity in this implementation, the Prisma ORM allows seamless migration to PostgreSQL or MySQL for production scale.
