import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CompleteBusinessLicenseTaskDto {
  @ApiProperty({
    description: 'Approval decision',
    example: 'APPROVED',
    enum: ['APPROVED', 'REJECTED'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiProperty({
    description: 'Flowable task ID (optional for legacy requests without workflow)',
    required: false,
  })
  @IsOptional()
  @IsString()
  taskId: string;

  @ApiProperty({
    description: 'Optional rejection reason',
    required: false,
    example: 'Missing mandatory document',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
