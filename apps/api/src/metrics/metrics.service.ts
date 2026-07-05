import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus, WorkerStatus } from '@job-scheduler/shared';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getGlobalMetrics(userId: string) {
    // We only count metrics for projects the user has access to
    const accessibleProjects = await this.prisma.project.findMany({
      where: {
        organization: {
          members: {
            some: { userId }
          }
        }
      },
      select: { id: true }
    });

    const projectIds = accessibleProjects.map(p => p.id);

    if (projectIds.length === 0) {
      return {
        jobs: {
          queued: 0,
          scheduled: 0,
          claimed: 0,
          running: 0,
          completed: 0,
          failed: 0,
          deadLetter: 0,
        },
        workers: {
          active: 0,
          totalLoad: 0,
        },
        queues: 0
      };
    }

    const jobCounts = await this.prisma.job.groupBy({
      by: ['status'],
      where: {
        queue: {
          projectId: { in: projectIds }
        }
      },
      _count: true
    });

    const jobs = {
      queued: 0,
      scheduled: 0,
      claimed: 0,
      running: 0,
      completed: 0,
      failed: 0,
      deadLetter: 0,
    };

    jobCounts.forEach(c => {
      if (c.status in jobs) {
        jobs[c.status as keyof typeof jobs] = c._count;
      }
    });

    // For workers, we just count all workers (global to the system)
    const workers = await this.prisma.worker.findMany({
      where: {
        status: { not: WorkerStatus.DEAD }
      },
      select: { currentLoad: true }
    });

    const queuesCount = await this.prisma.queue.count({
      where: { projectId: { in: projectIds } }
    });

    return {
      jobs,
      workers: {
        active: workers.length,
        totalLoad: workers.reduce((acc, w) => acc + w.currentLoad, 0),
      },
      queues: queuesCount
    };
  }
}
