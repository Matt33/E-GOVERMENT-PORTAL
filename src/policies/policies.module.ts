import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './policies.entity';

import { ScholarshipApplicationEntity } from '../scholarship/entities/scholarship-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, ScholarshipApplicationEntity])],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
