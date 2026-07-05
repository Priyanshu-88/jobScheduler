import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkerStatus } from '@job-scheduler/shared';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Return all workers, ordered by most recently heartbeat
    return this.prisma.worker.findMany({
      orderBy: { lastHeartbeatAt: 'desc' },
      take: 100 // simplistic limit
    });
  }
}
