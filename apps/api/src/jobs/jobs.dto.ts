import { IsString, IsUUID, IsEnum, IsOptional, IsInt, Min, IsObject, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@job-scheduler/shared';
import { Type } from 'class-transformer';

export class CreateJobDto {
  @ApiProperty({ example: 'queue-uuid' })
  @IsUUID()
  queueId!: string;

  @ApiProperty({ enum: JobType, example: JobType.IMMEDIATE })
  @IsEnum(JobType)
  type!: JobType;

  @ApiPropertyOptional({ example: { to: 'user@example.com' } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ example: '2026-07-06T10:00:00Z' })
  @IsOptional()
  @IsString()
  runAt?: string;

  @ApiPropertyOptional({ example: '0 0 * * *' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ example: 'batch-001' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ example: 'retry-policy-uuid' })
  @IsOptional()
  @IsUUID()
  retryPolicyId?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({ example: 'idem-key-123' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class GetJobsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'queue-uuid' })
  @IsOptional()
  @IsUUID()
  queueId?: string;

  @ApiPropertyOptional({ example: 'queued' })
  @IsOptional()
  @IsString()
  status?: string;
}

