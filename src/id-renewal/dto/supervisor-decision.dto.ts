import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class SupervisorDecisionDto {
  @ApiProperty({
    description: 'Supervisor decision',
    enum: ['APPROVED', 'REJECTED'],
    example: 'APPROVED',
  })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Flowable task id if available',
    example: '12345-abc',
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({
    description: 'Reason for rejection',
    example: 'Missing required documents',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
