import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateBusinessLicenseDto {
  @ApiProperty({ example: 'Ahmed Hassan' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'Hassan Electronics' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: '12345678901234' })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({
    example: 'Retail',
    enum: ['Retail', 'Service', 'Manufacturing', 'Tech'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['Retail', 'Service', 'Manufacturing', 'Tech'])
  businessType: string;
}