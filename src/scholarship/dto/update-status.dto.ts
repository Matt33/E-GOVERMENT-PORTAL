import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional } from 'class-validator';

export enum StatusAction {
  START_REVIEW = 'start_review',
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Action to perform on the application status',
    enum: StatusAction,
    example: StatusAction.START_REVIEW,
  })
  @IsString()
  @IsIn([StatusAction.START_REVIEW, StatusAction.APPROVE, StatusAction.REJECT])
  action: StatusAction;

  @ApiProperty({
    description: 'Optional reason (e.g. when rejecting)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
