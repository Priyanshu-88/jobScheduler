import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQueueDto, UpdateQueueDto } from './queues.dto';
import { QueueStats, JobStatus } from '@job-scheduler/shared';

@Injectable()
export class QueuesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateQueueDto) {
    // Check if user has access to the project via organization
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!project || project.organization.members.length === 0) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return this.prisma.queue.create({
      data: {
        name: dto.name,
        projectId: dto.projectId,
        priority: dto.priority,
        concurrencyLimit: dto.concurrencyLimit,
        defaultRetryPolicyId: dto.defaultRetryPolicyId,
      },
    });
  }

  async findAll(userId: string, projectId?: string) {
    const whereClause: any = {
      project: {
        organization: {
          members: {
            some: { userId }
          }
        }
      }
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    return this.prisma.queue.findMany({
      where: whereClause,
      include: {
        defaultRetryPolicy: true,
        _count: {
          select: { jobs: true }
        }
      }
    });
  }

  async findOne(userId: string, id: string) {
    const queue = await this.prisma.queue.findFirst({
      where: {
        id,
        project: {
          organization: {
            members: {
              some: { userId }
            }
          }
        }
      },
      include: {
        defaultRetryPolicy: true
      }
    });

    if (!queue) {
      throw new NotFoundException(`Queue with ID ${id} not found or access denied`);
    }

    return queue;
  }

  async update(userId: string, id: string, dto: UpdateQueueDto) {
    await this.findOne(userId, id); // check access

    return this.prisma.queue.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // check access

    return this.prisma.queue.delete({ where: { id } });
  }

  async pause(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.queue.update({
      where: { id },
      data: { isPaused: true },
    });
  }

  async resume(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.queue.update({
      where: { id },
      data: { isPaused: false },
    });
  }

  async getStats(userId: string, id: string): Promise<QueueStats> {
    const queue = await this.findOne(userId, id);

    const [
      queuedCount,
      scheduledCount,
      claimedCount,
      runningCount,
      completedCount,
      failedCount,
      deadLetterCount
    ] = await Promise.all([
      this.prisma.job.count({ where: { queueId: id, status: JobStatus.QUEUED } }),
      this.prisma.job.count({ where: { queueId: id, status: JobStatus.SCHEDULED } }),
      this.prisma.job.count({ where: { queueId: id, status: JobStatus.CLAIMED } }),
      this.prisma.job.count({ where: { queueId: id, status: JobStatus.RUNNING } }),
      this.prisma.job.count({ where: { queueId: id, status: JobStatus.COMPLETED } }),
      this.prisma.job.count({ where: { queueId: id, status: JobStatus.FAILED } }),
      this.prisma.job.count({ where: { queueId: id, status: JobStatus.DEAD_LETTER } }),
    ]);

    // Very naive throughput calculation for this version
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const completedLastMinute = await this.prisma.job.count({
      where: {
        queueId: id,
        status: JobStatus.COMPLETED,
        completedAt: { gte: oneMinuteAgo }
      }
    });

    return {
      queueId: id,
      queueName: queue.name,
      queued: queuedCount,
      scheduled: scheduledCount,
      claimed: claimedCount,
      running: runningCount,
      completed: completedCount,
      failed: failedCount,
      deadLetter: deadLetterCount,
      throughputPerMinute: completedLastMinute,
      averageDurationMs: 0, // Placeholder
      backlog: queuedCount + scheduledCount,
    };
  }
}
