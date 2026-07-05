import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    // Check if user has access to the organization
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId
        }
      }
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        organizationId: dto.organizationId,
        apiKey: `sk_live_${uuidv4().replace(/-/g, '')}`, // generate a secure API key
      },
    });
  }

  async findAll(userId: string, organizationId?: string) {
    const whereClause: any = {
      organization: {
        members: {
          some: { userId }
        }
      }
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    return this.prisma.project.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { queues: true }
        }
      }
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        organization: {
          members: {
            some: { userId }
          }
        }
      },
      include: {
        queues: true
      }
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found or access denied`);
    }

    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(userId, id); // check access

    return this.prisma.project.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // check access

    return this.prisma.project.delete({ where: { id } });
  }

  async rotateApiKey(userId: string, id: string) {
    await this.findOne(userId, id); // check access

    return this.prisma.project.update({
      where: { id },
      data: { apiKey: `sk_live_${uuidv4().replace(/-/g, '')}` },
    });
  }
}
