import { IsString, MinLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Main App' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'org-uuid' })
  @IsUUID()
  organizationId!: string;
}

export class UpdateProjectDto {
  @ApiProperty({ example: 'New Project Name' })
  @IsString()
  @MinLength(2)
  name!: string;
}
