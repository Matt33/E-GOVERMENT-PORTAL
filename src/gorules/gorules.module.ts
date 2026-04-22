import { Module } from '@nestjs/common';
import { GoRulesService } from './gorules.service';

@Module({
  providers: [GoRulesService],
  exports: [GoRulesService],
})
export class GoRulesModule {}
