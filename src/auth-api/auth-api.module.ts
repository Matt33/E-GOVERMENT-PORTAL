import { Module } from '@nestjs/common';
import { AuthApiController } from './auth-api.controller';
import { AuthApiService } from './auth-api.service';

@Module({
  controllers: [AuthApiController],
  providers: [AuthApiService],
})
export class AuthApiModule {}
