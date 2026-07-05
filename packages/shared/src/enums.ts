// ============================================================================
// Job Scheduler — Shared Enums
// ============================================================================
// These enums mirror the string values stored in the SQLite database.
// SQLite doesn't support native enums, so we use string columns validated
// at the application layer. These enums are the source of truth.
// ============================================================================

export enum JobStatus {
  QUEUED = 'queued',
  SCHEDULED = 'scheduled',
  CLAIMED = 'claimed',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}

export enum JobType {
  IMMEDIATE = 'immediate',
  DELAYED = 'delayed',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
  BATCH = 'batch',
}

export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  DRAINING = 'draining',
  DEAD = 'dead',
}

export enum RetryStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
}

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum OrgMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
