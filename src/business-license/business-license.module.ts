import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessLicenseController } from './business-license.controller';
import { BusinessLicenseService } from './business-license.service';
import { BusinessLicenseEntity } from './entities/business-license.entity';
import { GoRulesModule } from '../gorules/gorules.module';
import { FlowableModule } from '../flowable/flowable.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessLicenseEntity]),
    GoRulesModule,
    FlowableModule,
  ],
  controllers: [BusinessLicenseController],
  providers: [BusinessLicenseService],
  exports: [BusinessLicenseService],
})
export class BusinessLicenseModule {}
