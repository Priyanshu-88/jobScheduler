import { PrismaClient } from '@job-scheduler/database';
import { WorkerStatus, JobStatus } from '@job-scheduler/shared';

export class DeadWorkerReaper {
  private timer: NodeJS.Timeout | null = null;
  private staleThresholdMs: number;

  constructor(private prisma: PrismaClient) {
    this.staleThresholdMs = parseInt(process.env.WORKER_STALE_THRESHOLD_MS || '60000', 10);
  }

  start() {
    // Run every 30 seconds
    this.timer = setInterval(async () => {
      try {
        await this.reap();
      } catch (err) {
        console.error('Dead worker reaper failed:', err);
      }
    }, 30000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async reap() {
    const thresholdDate = new Date(Date.now() - this.staleThresholdMs);

    const deadWorkers = await this.prisma.worker.findMany({
      where: {
        status: { not: WorkerStatus.DEAD },
        lastHeartbeatAt: { lt: thresholdDate }
      }
    });

    for (const worker of deadWorkers) {
      console.log(`Reaping dead worker ${worker.id}...`);

      await this.prisma.$transaction(async (tx) => {
        // 1. Mark worker dead
        await tx.worker.update({
          where: { id: worker.id },
          data: { status: WorkerStatus.DEAD }
        });

        // 2. Requeue all its claimed/running jobs
        const jobs = await tx.job.findMany({
          where: {
            workerId: worker.id,
            status: { in: [JobStatus.CLAIMED, JobStatus.RUNNING] }
          }
        });

        for (const job of jobs) {
          await tx.job.update({
            where: { id: job.id },
            data: {
              status: JobStatus.QUEUED,
              workerId: null,
              claimedAt: null,
            }
          });
          
          await tx.jobLog.create({
            data: {
              jobId: job.id,
              level: 'warn',
              message: `Job requeued due to worker ${worker.id} death`,
            }
          });
        }
        
        if (jobs.length > 0) {
          console.log(`Requeued ${jobs.length} jobs from dead worker ${worker.id}`);
        }
      });
    }
  }
}
