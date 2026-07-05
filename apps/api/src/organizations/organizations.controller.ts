import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto, AddMemberDto } from './organizations.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@Request() req: any, @Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(req.user.id, createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations for the current user' })
  findAll(@Request() req: any) {
    return this.organizationsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific organization' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.organizationsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.update(req.user.id, id, updateOrganizationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an organization' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.organizationsService.remove(req.user.id, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to an organization' })
  addMember(@Request() req: any, @Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.organizationsService.addMember(req.user.id, id, addMemberDto);
  }
}
