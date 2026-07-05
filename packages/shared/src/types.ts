// ============================================================================
// Job Scheduler — Shared Types
// ============================================================================
// Shared interfaces and types used across API, Worker, and Frontend.
// ============================================================================

import { JobStatus, JobType, WorkerStatus, RetryStrategy, LogLevel, ExecutionStatus } from './enums';

// ---- API Response Envelope ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---- Auth ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ---- Job Creation ----

export interface CreateJobRequest {
  type: JobType;
  payload?: Record<string, unknown>;
  priority?: number;
  runAt?: string;               // ISO datetime for delayed/scheduled
  cronExpression?: string;      // For recurring
  batchId?: string;             // For batch jobs
  retryPolicyId?: string;
  maxAttempts?: number;
  idempotencyKey?: string;
}

// ---- Queue Stats ----

export interface QueueStats {
  queueId: string;
  queueName: string;
  queued: number;
  scheduled: number;
  claimed: number;
  running: number;
  completed: number;
  failed: number;
  deadLetter: number;
  throughputPerMinute: number;
  averageDurationMs: number;
  backlog: number;
}

// ---- Worker Info ----

export interface WorkerInfo {
  id: string;
  hostname: string;
  pid: number;
  status: WorkerStatus;
  startedAt: string;
  lastHeartbeatAt: string;
  concurrencyCapacity: number;
  currentLoad: number;
}

// ---- WebSocket Events ----

export enum WsEvent {
  JOB_CREATED = 'job:created',
  JOB_STATUS_CHANGED = 'job:status_changed',
  WORKER_HEARTBEAT = 'worker:heartbeat',
  WORKER_STATUS_CHANGED = 'worker:status_changed',
  QUEUE_STATS_UPDATED = 'queue:stats_updated',
}

export interface WsJobEvent {
  jobId: string;
  queueId: string;
  status: JobStatus;
  type: JobType;
  timestamp: string;
}

export interface WsWorkerEvent {
  workerId: string;
  status: WorkerStatus;
  currentLoad: number;
  timestamp: string;
}
