import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, GetJobsQueryDto } from './jobs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job (Immediate, Delayed, Scheduled, Recurring, Batch)' })
  create(@Request() req: any, @Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(req.user.id, createJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs with optional filtering' })
  findAll(
    @Request() req: any, 
    @Query() query: GetJobsQueryDto,
  ) {
    const { page, pageSize, queueId, status } = query;
    return this.jobsService.findAll(req.user.id, { page, pageSize }, queueId, status);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get rollup status of a batch' })
  getBatchStatus(@Request() req: any, @Param('batchId') batchId: string) {
    return this.jobsService.getBatchStatus(req.user.id, batchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific job' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.jobsService.findOne(req.user.id, id);
  }

  @Post(':id/replay')
  @ApiOperation({ summary: 'Replay a dead letter job' })
  replay(@Request() req: any, @Param('id') id: string) {
    return this.jobsService.replay(req.user.id, id);
  }
}
