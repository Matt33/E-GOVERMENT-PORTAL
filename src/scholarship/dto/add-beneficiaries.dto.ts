import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class BeneficiaryItemDto {
  @ApiProperty({ example: 'Ahmed Hassan', description: 'Employee full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  employeeName: string;

  @ApiProperty({ example: 'EG-9876543210', description: 'Employee national ID' })
  @IsString()
  @IsNotEmpty()
  employeeNationalId: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Employee job role' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  employeeRole: string;

  @ApiProperty({ example: 'Machine Learning Specialization', description: 'Training program for this employee' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  trainingProgram: string;
}

export class AddBeneficiariesDto {
  @ApiProperty({ type: [BeneficiaryItemDto], description: 'List of employee beneficiaries' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BeneficiaryItemDto)
  beneficiaries: BeneficiaryItemDto[];
}
