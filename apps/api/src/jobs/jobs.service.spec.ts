import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateJobDto } from './jobs.dto';
import { JobType } from '@job-scheduler/shared';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    queue: {
      findUnique: jest.fn(),
    },
    job: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    scheduledJob: {
      create: jest.fn(),
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const createJobDto: CreateJobDto = {
      queueId: 'queue-123',
      type: JobType.IMMEDIATE,
      payload: { data: 'test' },
      priority: 5,
      maxAttempts: 3,
    };

    it('should throw ForbiddenException if user has no access to the queue', async () => {
      // Mock that the queue exists but the user is not in the organization
      mockPrisma.queue.findUnique.mockResolvedValue({
        id: 'queue-123',
        project: {
          organization: {
            members: [],
          },
        },
      });

      await expect(service.create(userId, createJobDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create an immediate job successfully', async () => {
      // Mock user has access
      mockPrisma.queue.findUnique.mockResolvedValue({
        id: 'queue-123',
        project: {
          organization: {
            members: [{ userId }],
          },
        },
      });

      const expectedJob = {
        id: 'job-123',
        ...createJobDto,
        payload: JSON.stringify(createJobDto.payload),
        status: 'queued',
      };

      mockPrisma.job.create.mockResolvedValue(expectedJob);

      const result = await service.create(userId, createJobDto);
      expect(result).toEqual(expectedJob);
      expect(mockPrisma.job.create).toHaveBeenCalled();
    });

    it('should create a scheduled job and set status to scheduled', async () => {
      // Mock user has access
      mockPrisma.queue.findUnique.mockResolvedValue({
        id: 'queue-123',
        project: {
          organization: {
            members: [{ userId }],
          },
        },
      });

      const scheduledDto: CreateJobDto = {
        ...createJobDto,
        type: JobType.SCHEDULED,
        runAt: new Date('2030-01-01T00:00:00Z').toISOString(),
      };

      const expectedJob = {
        id: 'job-123',
        ...scheduledDto,
        payload: JSON.stringify(scheduledDto.payload),
        status: 'scheduled',
      };

      mockPrisma.job.create.mockResolvedValue(expectedJob);

      const result = await service.create(userId, scheduledDto);
      expect(result).toEqual(expectedJob);
      expect(mockPrisma.job.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const userId = 'user-123';
    const paginationDto = { page: 1, pageSize: 10 };

    it('should return paginated jobs with total count', async () => {
      const mockJobs = [{ id: 'job-1' }, { id: 'job-2' }];
      mockPrisma.job.findMany.mockResolvedValue(mockJobs);
      mockPrisma.job.count.mockResolvedValue(2);

      const result = await service.findAll(userId, paginationDto);

      expect(result).toEqual({
        data: mockJobs,
        meta: {
          total: 2,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
      });
      
      // Should verify access in the where clause
      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            queue: {
              project: {
                organization: {
                  members: {
                    some: { userId },
                  },
                },
              },
            },
          }),
        })
      );
    });
  });
});
