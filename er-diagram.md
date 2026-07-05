# Entity-Relationship (ER) Diagram

This document illustrates the database schema of the Job Scheduler platform using a Mermaid Entity-Relationship diagram. The database is managed via Prisma.

## Schema Diagram

```mermaid
erDiagram
    %% Core Entities
    User {
        String id PK
        String email
        String passwordHash
        String name
        String role
    }

    Organization {
        String id PK
        String name
        String ownerId FK
    }

    OrganizationMember {
        String id PK
        String organizationId FK
        String userId FK
        String role
    }

    Project {
        String id PK
        String organizationId FK
        String name
        String apiKey
    }

    Queue {
        String id PK
        String projectId FK
        String name
        Int priority
        Int concurrencyLimit
        Boolean isPaused
        String defaultRetryPolicyId FK
    }

    RetryPolicy {
        String id PK
        String name
        String strategy
        Int baseDelayMs
        Int maxAttempts
    }

    %% Job Entities
    Job {
        String id PK
        String queueId FK
        String type
        String status
        String payload
        DateTime runAt
        String workerId FK
    }

    JobExecution {
        String id PK
        String jobId FK
        String workerId FK
        Int attemptNumber
        String status
    }

    ScheduledJob {
        String id PK
        String jobId FK
        String cronExpression
        DateTime nextRunAt
    }

    DeadLetterJob {
        String id PK
        String originalJobId FK
        String queueId FK
        String failureReason
    }

    JobLog {
        String id PK
        String jobId FK
        String level
        String message
    }

    %% Worker Entities
    Worker {
        String id PK
        String hostname
        String status
        Int currentLoad
    }

    WorkerHeartbeat {
        String id PK
        String workerId FK
        DateTime timestamp
    }

    %% Relationships
    User ||--o{ Organization : "owns"
    User ||--o{ OrganizationMember : "has"
    Organization ||--o{ OrganizationMember : "contains"
    Organization ||--o{ Project : "contains"
    
    Project ||--o{ Queue : "contains"
    Queue ||--o{ Job : "contains"
    Queue }o--o| RetryPolicy : "uses default"
    
    Job }o--o| RetryPolicy : "uses"
    Job ||--o{ JobExecution : "has attempts"
    Job ||--o| ScheduledJob : "is template for"
    Job ||--o| DeadLetterJob : "becomes"
    Job ||--o{ JobLog : "generates"
    
    Worker ||--o{ Job : "claims"
    Worker ||--o{ JobExecution : "executes"
    Worker ||--o{ WorkerHeartbeat : "emits"
```
