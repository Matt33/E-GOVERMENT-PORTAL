import { Injectable, Logger } from '@nestjs/common';
import { ZenEngine } from '@gorules/zen-engine';
import * as fs from 'fs';
import * as path from 'path';
import { CreateBusinessLicenseDto } from './dto/create-business-license.dto';

@Injectable()
export class GoRulesService {
  private readonly logger = new Logger(GoRulesService.name);
  private engine: ZenEngine;
  private decision: any;

  constructor() {
    this.engine = new ZenEngine();

    const rulePath = path.join(
      process.cwd(),
      'src',
      'business-license',
      'business-rules.json',
    );
    const ruleContent = fs.readFileSync(rulePath);

    this.decision = this.engine.createDecision(ruleContent);
  }

  async evaluateLicenseRules(dto: CreateBusinessLicenseDto) {
    try {
      const payload = {
        businessType: dto.businessType,
      };

      this.logger.log(`Evaluating GoRules with: ${JSON.stringify(payload)}`);

      const evaluation = await this.decision.evaluate(payload);
      const result = evaluation.result;

      this.logger.log(`GoRules Result: ${JSON.stringify(result)}`);

      return {
        requireHealthReview: result?.requireHealthReview || false,
        requireFinanceReview: result?.requireFinanceReview || false,
      };
    } catch (error) {
      this.logger.error('Error evaluating GoRules', error.message);
      return { requireHealthReview: false, requireFinanceReview: false };
    }
  }
}
