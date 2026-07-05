import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto, AddMemberDto } from './organizations.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'admin',
          }
        }
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        _count: {
          select: { members: true, projects: true }
        }
      }
    });
  }

  async findOne(userId: string, id: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        id,
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        projects: true,
      }
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found or access denied`);
    }

    return org;
  }

  async update(userId: string, id: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (org.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can update the organization');
    }

    return this.prisma.organization.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(userId: string, id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (org.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete the organization');
    }

    return this.prisma.organization.delete({ where: { id } });
  }

  async addMember(userId: string, orgId: string, dto: AddMemberDto) {
    // Check if user is admin of org
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId
        }
      }
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Only admins can add members');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!targetUser) {
      throw new NotFoundException(`User with email ${dto.email} not found`);
    }

    return this.prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUser.id
        }
      },
      update: {
        role: dto.role
      },
      create: {
        organizationId: orgId,
        userId: targetUser.id,
        role: dto.role
      }
    });
  }
}
