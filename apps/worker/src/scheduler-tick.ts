import { PrismaClient } from '@job-scheduler/database';
import { JobStatus } from '@job-scheduler/shared';
import * as cronParser from 'cron-parser';

export class SchedulerTick {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(private prisma: PrismaClient) {
    this.intervalMs = parseInt(process.env.SCHEDULER_TICK_INTERVAL_MS || '15000', 10);
  }

  start() {
    this.timer = setInterval(async () => {
      try {
        await this.tick();
      } catch (err) {
        console.error('Scheduler tick failed:', err);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    // 1. Find all scheduled jobs that are due
    const dueJobs = await this.prisma.scheduledJob.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: new Date() }
      },
      include: {
        job: true // get the template job details
      }
    });

    if (dueJobs.length === 0) return;

    for (const scheduled of dueJobs) {
      // 2. Materialize a new job instance for execution
      await this.prisma.$transaction(async (tx) => {
        const { job } = scheduled;
        
        await tx.job.create({
          data: {
            queueId: job.queueId,
            type: job.type,
            payload: job.payload,
            status: JobStatus.QUEUED,
            priority: job.priority,
            runAt: scheduled.nextRunAt,
            batchId: job.batchId,
            retryPolicyId: job.retryPolicyId,
            maxAttempts: job.maxAttempts,
          }
        });

        // 3. Compute next run time for the template
        try {
          const interval = cronParser.parseExpression(scheduled.cronExpression);
          const nextRunAt = interval.next().toDate();

          await tx.scheduledJob.update({
            where: { id: scheduled.id },
            data: { 
              nextRunAt,
              lastRunAt: new Date()
            }
          });
        } catch (err) {
          // If cron expression is invalid, deactivate the schedule
          await tx.scheduledJob.update({
            where: { id: scheduled.id },
            data: { isActive: false }
          });
          console.error(`Deactivated scheduled job ${scheduled.id} due to cron error`, err);
        }
      });
    }
  }
}
