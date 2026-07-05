import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Request() req: any, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects for the current user' })
  findAll(@Request() req: any, @Query('organizationId') organizationId?: string) {
    return this.projectsService.findAll(req.user.id, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific project' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(req.user.id, id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.remove(req.user.id, id);
  }

  @Post(':id/rotate-key')
  @ApiOperation({ summary: 'Rotate API key for a project' })
  rotateApiKey(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.rotateApiKey(req.user.id, id);
  }
}
