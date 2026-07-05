import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './jobs.dto';
import { JobType, JobStatus } from '@job-scheduler/shared';
import * as cronParser from 'cron-parser';
import { PaginationDto, paginate } from '../common';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateJobDto) {
    // Check if user has access to the queue's project
    const queue = await this.prisma.queue.findUnique({
      where: { id: dto.queueId },
      include: {
        project: {
          include: {
            organization: {
              include: {
                members: {
                  where: { userId }
                }
              }
            }
          }
        }
      }
    });

    if (!queue || queue.project.organization.members.length === 0) {
      throw new ForbiddenException('You do not have access to this queue');
    }

    // Validate cron expression for recurring jobs
    if (dto.type === JobType.RECURRING) {
      if (!dto.cronExpression) {
        throw new BadRequestException('cronExpression is required for recurring jobs');
      }
      try {
        cronParser.parseExpression(dto.cronExpression);
      } catch (err) {
        throw new BadRequestException('Invalid cron expression');
      }
    }

    // Handle idempotency key
    if (dto.idempotencyKey) {
      const existingJob = await this.prisma.job.findUnique({
        where: { idempotencyKey: dto.idempotencyKey }
      });
      if (existingJob) {
        return existingJob; // Return the existing job to handle retries gracefully
      }
    }

    let status = JobStatus.QUEUED;
    let runAt = null;

    if (dto.type === JobType.DELAYED || dto.type === JobType.SCHEDULED) {
      status = JobStatus.SCHEDULED;
      runAt = dto.runAt ? new Date(dto.runAt) : new Date();
    }

    // Wrap in a transaction if we need to create scheduled_jobs row too
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          queueId: dto.queueId,
          type: dto.type,
          payload: dto.payload ? JSON.stringify(dto.payload) : '{}',
          status,
          priority: dto.priority || 0,
          runAt,
          cronExpression: dto.cronExpression,
          batchId: dto.batchId,
          retryPolicyId: dto.retryPolicyId,
          maxAttempts: dto.maxAttempts || 3,
          idempotencyKey: dto.idempotencyKey,
        }
      });

      if (dto.type === JobType.RECURRING) {
        const interval = cronParser.parseExpression(dto.cronExpression as string);
        await tx.scheduledJob.create({
          data: {
            jobId: job.id,
            cronExpression: dto.cronExpression as string,
            nextRunAt: interval.next().toDate(),
          }
        });
      }

      return job;
    });
  }

  async findAll(userId: string, paginationDto: PaginationDto, queueId?: string, status?: string) {
    const whereClause: any = {
      queue: {
        project: {
          organization: {
            members: {
              some: { userId }
            }
          }
        }
      }
    };

    if (queueId) {
      whereClause.queueId = queueId;
    }
    if (status) {
      whereClause.status = status;
    }

    const page = paginationDto.page || 1;
    const pageSize = paginationDto.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      this.prisma.job.count({ where: whereClause }),
      this.prisma.job.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      })
    ]);

    return paginate(data, total, page, pageSize);
  }

  async findOne(userId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        queue: {
          project: {
            organization: {
              members: {
                some: { userId }
              }
            }
          }
        }
      },
      include: {
        executions: true,
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found or access denied`);
    }

    // Parse payload back to object
    return {
      ...job,
      payload: JSON.parse(job.payload)
    };
  }

  async getBatchStatus(userId: string, batchId: string) {
    // Check access by finding one job in the batch
    const anyJob = await this.prisma.job.findFirst({
      where: {
        batchId,
        queue: {
          project: {
            organization: {
              members: {
                some: { userId }
              }
            }
          }
        }
      }
    });

    if (!anyJob) {
      throw new NotFoundException(`Batch ${batchId} not found or access denied`);
    }

    const counts = await this.prisma.job.groupBy({
      by: ['status'],
      where: { batchId },
      _count: true
    });

    const statusCounts = counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      batchId,
      statusCounts
    };
  }

  async replay(userId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        status: JobStatus.DEAD_LETTER,
        queue: {
          project: {
            organization: {
              members: { some: { userId } }
            }
          }
        }
      }
    });

    if (!job) {
      throw new NotFoundException(`Dead letter job with ID ${id} not found or access denied`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete from DeadLetterJob table
      await tx.deadLetterJob.deleteMany({
        where: { originalJobId: id }
      });

      // 2. Reset job status and attempts
      const updatedJob = await tx.job.update({
        where: { id },
        data: {
          status: JobStatus.QUEUED,
          attemptCount: 0,
          runAt: new Date(),
        }
      });

      // 3. Add a log entry
      await tx.jobLog.create({
        data: {
          jobId: id,
          level: 'info',
          message: 'Job replayed from Dead Letter Queue by user.',
        }
      });

      return updatedJob;
    });
  }
}
