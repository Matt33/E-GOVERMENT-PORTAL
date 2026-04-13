import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CompleteTaskDto {
  @ApiProperty({
    description: 'Review decision',
    example: 'APPROVED',
    enum: ['APPROVED', 'REJECTED'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiProperty({ description: 'Flowable task ID' })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ required: false, description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  reason?: string;
}
