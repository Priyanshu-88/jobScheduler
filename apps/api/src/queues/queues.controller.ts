import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { CreateQueueDto, UpdateQueueDto } from './queues.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new queue' })
  create(@Request() req: any, @Body() createQueueDto: CreateQueueDto) {
    return this.queuesService.create(req.user.id, createQueueDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all queues for the current user' })
  findAll(@Request() req: any, @Query('projectId') projectId?: string) {
    return this.queuesService.findAll(req.user.id, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific queue' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.queuesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a queue' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateQueueDto: UpdateQueueDto) {
    return this.queuesService.update(req.user.id, id, updateQueueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a queue' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.queuesService.remove(req.user.id, id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a queue' })
  pause(@Request() req: any, @Param('id') id: string) {
    return this.queuesService.pause(req.user.id, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a queue' })
  resume(@Request() req: any, @Param('id') id: string) {
    return this.queuesService.resume(req.user.id, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  getStats(@Request() req: any, @Param('id') id: string) {
    return this.queuesService.getStats(req.user.id, id);
  }
}
