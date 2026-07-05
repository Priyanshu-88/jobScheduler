import { PrismaClient } from '@job-scheduler/database';
import { Executor } from './executor';
import { Claimer } from './claimer';

export class Poller {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private claimer: Claimer;
  private intervalMs: number;

  constructor(
    private prisma: PrismaClient,
    private workerId: string,
    private executor: Executor,
  ) {
    this.claimer = new Claimer(prisma, workerId);
    this.intervalMs = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '2000', 10);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      if (!this.executor.isAtCapacity()) {
        const capacity = this.executor.availableCapacity;
        const jobs = await this.claimer.claimJobs(capacity);
        
        for (const job of jobs) {
          // Fire and forget, executor handles concurrency limits internally
          this.executor.execute(job).catch(console.error);
        }

        // If we claimed jobs, poll again immediately without waiting, up to capacity
        if (jobs.length > 0) {
          setImmediate(() => this.poll());
          return;
        }
      }
    } catch (err) {
      console.error('Error during polling:', err);
    }

    // Wait and poll again
    this.timer = setTimeout(() => this.poll(), this.intervalMs);
  }
}
