import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class AddFinancialsDto {
  @ApiProperty({ example: 30000, description: 'Tuition fee amount' })
  @IsNumber()
  @Min(0)
  tuitionFee: number;

  @ApiProperty({ example: 5000, description: 'Materials and supplies cost' })
  @IsNumber()
  @Min(0)
  materialsCost: number;

  @ApiProperty({ example: 3000, description: 'Travel and accommodation cost' })
  @IsNumber()
  @Min(0)
  travelCost: number;

  @ApiProperty({ example: 'National Bank of Egypt', description: 'Bank name for disbursement' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  bankName: string;

  @ApiProperty({ example: 'EG380019000500000002611324390', description: 'IBAN or bank account number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bankAccountNumber: string;

  @ApiProperty({ required: false, description: 'Path to supporting document (uploaded separately)' })
  @IsOptional()
  @IsString()
  supportingDocumentPath?: string;
}
