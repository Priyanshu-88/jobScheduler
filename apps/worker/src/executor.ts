import { PrismaClient, Job } from '@job-scheduler/database';
import { JobStatus, LogLevel } from '@job-scheduler/shared';
import { calculateNextRunAt } from './retry';

export class Executor {
  private activeJobs = new Set<string>();

  constructor(
    private prisma: PrismaClient,
    private workerId: string,
    public capacity: number,
  ) {}

  get availableCapacity(): number {
    return this.capacity - this.activeJobs.size;
  }

  isAtCapacity(): boolean {
    return this.activeJobs.size >= this.capacity;
  }

  async execute(job: Job) {
    if (this.activeJobs.has(job.id)) return;
    
    this.activeJobs.add(job.id);
    
    try {
      await this.runJob(job);
    } finally {
      this.activeJobs.delete(job.id);
      // Update worker load
      await this.prisma.worker.update({
        where: { id: this.workerId },
        data: { currentLoad: this.activeJobs.size }
      }).catch(console.error);
    }
  }

  async waitForAll() {
    while (this.activeJobs.size > 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  get runningJobs(): string[] {
    return Array.from(this.activeJobs);
  }

  private async runJob(job: Job) {
    const attempt = job.attemptCount + 1;
    const execution = await this.prisma.jobExecution.create({
      data: {
        jobId: job.id,
        workerId: this.workerId,
        attemptNumber: attempt,
        status: 'running',
      }
    });

    await this.prisma.job.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING, attemptCount: attempt }
    });

    await this.log(job.id, execution.id, LogLevel.INFO, `Starting attempt ${attempt}`);
    
    const startTime = Date.now();
    try {
      // ----------------------------------------------------
      // SIMULATED JOB EXECUTION
      // ----------------------------------------------------
      const payload = JSON.parse(job.payload);
      
      // Simulate work based on payload type
      if (payload.action === 'fail') {
        throw new Error(payload.errorMsg || 'Simulated failure');
      } else if (payload.action === 'sleep') {
        const ms = payload.ms || 1000;
        await new Promise(r => setTimeout(r, ms));
      } else {
        // Default: just take some time
        await new Promise(r => setTimeout(r, 500));
      }
      // ----------------------------------------------------
      
      const duration = Date.now() - startTime;

      // Success
      await this.prisma.$transaction([
        this.prisma.jobExecution.update({
          where: { id: execution.id },
          data: { status: 'completed', finishedAt: new Date(), durationMs: duration }
        }),
        this.prisma.job.update({
          where: { id: job.id },
          data: { status: JobStatus.COMPLETED, completedAt: new Date() }
        })
      ]);

      await this.log(job.id, execution.id, LogLevel.INFO, `Job completed successfully in ${duration}ms`);

    } catch (err: any) {
      const duration = Date.now() - startTime;
      const errorMsg = err.message || 'Unknown error';
      const errorStack = err.stack || '';

      await this.log(job.id, execution.id, LogLevel.ERROR, `Job failed: ${errorMsg}`);

      // Handle Failure / Retry / DLQ
      const retryPolicy = job.retryPolicyId ? await this.prisma.retryPolicy.findUnique({ where: { id: job.retryPolicyId } }) : null;
      const maxAttempts = job.maxAttempts;

      if (attempt >= maxAttempts) {
        // Move to DLQ
        await this.prisma.$transaction([
          this.prisma.jobExecution.update({
            where: { id: execution.id },
            data: { status: 'failed', finishedAt: new Date(), durationMs: duration, errorMessage: errorMsg, errorStack }
          }),
          this.prisma.job.update({
            where: { id: job.id },
            data: { status: JobStatus.DEAD_LETTER, failedAt: new Date() }
          }),
          this.prisma.deadLetterJob.create({
            data: {
              originalJobId: job.id,
              queueId: job.queueId,
              payload: job.payload,
              failureReason: errorMsg,
            }
          })
        ]);
        await this.log(job.id, execution.id, LogLevel.WARN, `Job moved to Dead Letter Queue after ${attempt} attempts`);
      } else {
        // Retry
        const nextRunAt = retryPolicy ? calculateNextRunAt(retryPolicy, attempt) : new Date(Date.now() + 5000);
        await this.prisma.$transaction([
          this.prisma.jobExecution.update({
            where: { id: execution.id },
            data: { status: 'failed', finishedAt: new Date(), durationMs: duration, errorMessage: errorMsg, errorStack }
          }),
          this.prisma.job.update({
            where: { id: job.id },
            data: { status: JobStatus.QUEUED, runAt: nextRunAt, workerId: null, claimedAt: null }
          })
        ]);
        await this.log(job.id, execution.id, LogLevel.INFO, `Job scheduled for retry at ${nextRunAt.toISOString()}`);
      }
    }
  }

  private async log(jobId: string, executionId: string, level: string, message: string) {
    await this.prisma.jobLog.create({
      data: { jobId, executionId, level, message }
    }).catch(console.error); // don't let logging fail the execution
  }
}
