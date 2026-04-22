import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthApiLoginDto {
  @ApiProperty({ example: 'citizen' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'admin' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
