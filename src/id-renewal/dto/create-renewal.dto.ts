import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateRenewalDto {
  @ApiProperty({ example: 'John', description: 'First name of the citizen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the citizen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'EG-1234567890', description: 'National ID number' })
  @IsString()
  @IsNotEmpty()
  nationalId: string;
}
