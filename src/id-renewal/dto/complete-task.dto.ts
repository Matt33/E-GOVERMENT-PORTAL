import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CompleteTaskDto {
  @ApiProperty({ description: 'Approval decision', example: true })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({
    description: 'Reason for rejection',
    example: 'Missing documents',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
