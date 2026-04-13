import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsNumber,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class AdminDecisionDto {
  @ApiProperty({
    description: 'Admin decision',
    example: 'ACCEPTED',
    enum: ['ACCEPTED', 'REJECTED'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACCEPTED', 'REJECTED'])
  action: 'ACCEPTED' | 'REJECTED';

  @ApiProperty({
    description: 'Flowable task ID (optional if task unavailable)',
    required: false,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    description: 'Mandatory rejection reason',
    required: false,
  })
  @ValidateIf((o) => o.action === 'REJECTED')
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required when rejecting' })
  reason?: string;

  @ApiProperty({
    description:
      'Final coverage percentage set by admin (required when approving). Overrides GoRules recommendation.',
    required: false,
    example: 80,
  })
  @ValidateIf((o) => o.action === 'ACCEPTED')
  @IsNumber()
  @Min(0)
  @Max(100)
  finalCoveragePercent?: number;

  @ApiProperty({
    description: 'Optional admin notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
