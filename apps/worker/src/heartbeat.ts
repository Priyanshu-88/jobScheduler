import { PrismaClient } from '@job-scheduler/database';
import * as osUtils from 'os';

export class HeartbeatManager {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(
    private prisma: PrismaClient,
    private workerId: string,
  ) {
    this.intervalMs = parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || '10000', 10);
  }

  start() {
    this.timer = setInterval(async () => {
      try {
        await this.sendHeartbeat();
      } catch (err) {
        console.error('Failed to send heartbeat:', err);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sendHeartbeat() {
    const cpuUsage = osUtils.loadavg()[0]; // 1 min load avg
    const totalMem = osUtils.totalmem();
    const freeMem = osUtils.freemem();
    const memUsage = (totalMem - freeMem) / totalMem;

    await this.prisma.$transaction([
      this.prisma.worker.update({
        where: { id: this.workerId },
        data: { lastHeartbeatAt: new Date() },
      }),
      this.prisma.workerHeartbeat.create({
        data: {
          workerId: this.workerId,
          cpuUsage,
          memUsage,
        },
      }),
    ]);
  }
}
