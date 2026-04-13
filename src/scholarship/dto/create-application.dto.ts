import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: 'Acme Tech Solutions', description: 'Business name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessName: string;

  @ApiProperty({
    example: 'uuid-from-service-3',
    description: 'Business license ID from the Business License service',
  })
  @IsString()
  @IsNotEmpty()
  businessLicenseId: string;

  @ApiProperty({
    example: 'MEDIUM',
    enum: ['SMALL', 'MEDIUM', 'ENTERPRISE'],
    description: 'Business tier classification',
  })
  @IsString()
  @IsIn(['SMALL', 'MEDIUM', 'ENTERPRISE'])
  businessTier: string;

  @ApiProperty({
    example: 'TECH_AI',
    description: 'Industry sector',
    enum: ['TECH_AI', 'HEALTHCARE', 'MANUFACTURING', 'RETAIL', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiProperty({ example: 5, description: 'Number of years the business has been active' })
  @IsInt()
  @Min(0)
  yearsActive: number;

  @ApiProperty({
    example: 'EMPLOYEE_UPSKILLING',
    enum: ['EMPLOYEE_UPSKILLING', 'RD_GRANT', 'VOCATIONAL_TRAINING'],
    description: 'Type of scholarship being requested',
  })
  @IsString()
  @IsIn(['EMPLOYEE_UPSKILLING', 'RD_GRANT', 'VOCATIONAL_TRAINING'])
  scholarshipType: string;

  @ApiProperty({ example: 'Advanced AI Engineering Program', description: 'Training title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  trainingTitle: string;

  @ApiProperty({ example: 'Cairo Tech Institute', description: 'Training provider name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  trainingProvider: string;
}
