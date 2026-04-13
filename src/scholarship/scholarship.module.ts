import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScholarshipApplicationEntity } from './entities/scholarship-application.entity';
import { ScholarshipBeneficiaryEntity } from './entities/scholarship-beneficiary.entity';
import { ScholarshipFinancialEntity } from './entities/scholarship-financial.entity';
import { ScholarshipService } from './scholarship.service';
import { ScholarshipRulesService } from './scholarship-rules.service';
import { ScholarshipController } from './scholarship.controller';
import { FlowableModule } from '../flowable/flowable.module';
import { GoRulesModule } from '../gorules/gorules.module';
import { BusinessLicenseModule } from '../business-license/business-license.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScholarshipApplicationEntity,
      ScholarshipBeneficiaryEntity,
      ScholarshipFinancialEntity,
    ]),
    FlowableModule,
    GoRulesModule,
    BusinessLicenseModule,
  ],
  controllers: [ScholarshipController],
  providers: [ScholarshipService, ScholarshipRulesService],
  exports: [ScholarshipService],
})
export class ScholarshipModule {}
