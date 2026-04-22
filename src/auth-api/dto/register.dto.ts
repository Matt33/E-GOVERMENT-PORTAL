import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ahmed.hassan' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Ahmed Hassan' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
