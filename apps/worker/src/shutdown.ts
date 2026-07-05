import { PrismaClient } from '@job-scheduler/database';
import { WorkerStatus, JobStatus } from '@job-scheduler/shared';
import { Poller } from './poller';
import { Executor } from './executor';
import { HeartbeatManager } from './heartbeat';
import { SchedulerTick } from './scheduler-tick';
import { DeadWorkerReaper } from './reaper';

export class ShutdownHandler {
  private isShuttingDown = false;

  constructor(
    private prisma: PrismaClient,
    private workerId: string,
    private poller: Poller,
    private executor: Executor,
    private heartbeat: HeartbeatManager,
    private scheduler?: SchedulerTick,
    private reaper?: DeadWorkerReaper,
  ) {}

  listen() {
    const handleSignal = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      // 1. Stop polling and heartbeats
      this.poller.stop();
      this.heartbeat.stop();
      if (this.scheduler) this.scheduler.stop();
      if (this.reaper) this.reaper.stop();

      // 2. Mark worker as draining
      await this.prisma.worker.update({
        where: { id: this.workerId },
        data: { status: WorkerStatus.DRAINING }
      });

      // 3. Wait for active jobs to finish
      console.log(`Waiting for ${this.executor.runningJobs.length} active jobs to finish...`);
      
      const gracePeriodMs = parseInt(process.env.WORKER_SHUTDOWN_GRACE_MS || '30000', 10);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, gracePeriodMs));
      const finishPromise = this.executor.waitForAll();

      await Promise.race([finishPromise, timeoutPromise]);

      const remainingJobs = this.executor.runningJobs;
      if (remainingJobs.length > 0) {
        console.warn(`⚠️ Grace period expired. Requeuing ${remainingJobs.length} jobs.`);
      }

      // 4. Mark worker dead and exit
      await this.prisma.worker.update({
        where: { id: this.workerId },
        data: { status: WorkerStatus.DEAD }
      });

      console.log('👋 Worker shutdown complete.');
      process.exit(0);
    };

    process.on('SIGTERM', () => handleSignal('SIGTERM'));
    process.on('SIGINT', () => handleSignal('SIGINT'));
  }
}
