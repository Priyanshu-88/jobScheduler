import { IsString, MinLength, IsUUID, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQueueDto {
  @ApiProperty({ example: 'email-queue' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  concurrencyLimit?: number;

  @ApiPropertyOptional({ example: 'retry-policy-uuid' })
  @IsOptional()
  @IsUUID()
  defaultRetryPolicyId?: string;
}

export class UpdateQueueDto {
  @ApiPropertyOptional({ example: 'email-queue' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  concurrencyLimit?: number;

  @ApiPropertyOptional({ example: 'retry-policy-uuid' })
  @IsOptional()
  @IsUUID()
  defaultRetryPolicyId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPaused?: boolean;
}
