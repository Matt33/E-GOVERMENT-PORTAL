import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdRenewalController } from './id-renewal.controller';
import { IdRenewalService } from './id-renewal.service';
import { GoRulesModule } from '../gorules/gorules.module';
import { FlowableModule } from '../flowable/flowable.module';
import { RenewalRequestEntity } from './renewal-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RenewalRequestEntity]),
    GoRulesModule,
    FlowableModule,
  ],
  controllers: [IdRenewalController],
  providers: [IdRenewalService],
  exports: [IdRenewalService],
})
export class IdRenewalModule {}
