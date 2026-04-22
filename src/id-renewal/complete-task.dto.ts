import { ApiProperty } from '@nestjs/swagger';

export class CompleteTaskDto {
  @ApiProperty({ example: true, description: 'Approve or reject the request' })
  approved: boolean;

  @ApiProperty({ example: 'Documents are valid', required: false })
  reason?: string;
}
