import { Injectable, Logger } from '@nestjs/common';
import { ZenEngine } from '@gorules/zen-engine';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
}

export interface QuotaResult {
  maxScholarships: number;
  withinQuota: boolean;
  remainingQuota: number;
}

export interface FundingResult {
  coveragePercent: number;
  coverageAmount: number;
}

@Injectable()
export class ScholarshipRulesService {
  private readonly logger = new Logger(ScholarshipRulesService.name);

  private rulesDir(): string {
    return path.join(process.cwd(), 'rules');
  }

  private async evaluateRule(
    ruleFile: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const engine = new ZenEngine();
    const filePath = path.join(this.rulesDir(), ruleFile);
    const content = await fs.readFile(filePath);
    const decision = engine.createDecision(content);
    const { result } = await decision.evaluate(input);
    this.logger.debug(
      `Rule ${ruleFile} input=${JSON.stringify(input)} result=${JSON.stringify(result)}`,
    );
    return (result ?? {}) as Record<string, unknown>;
  }

  async evaluateEligibility(
    licenseStatus: string,
    yearsActive: number,
  ): Promise<EligibilityResult> {
    try {
      const result = await this.evaluateRule('scholarship_eligibility', {
        licenseStatus,
        yearsActive,
      });

      return {
        eligible: result.eligible === true || result.eligible === 'true',
        reason: String(result.reason ?? '').replace(/^"|"$/g, ''),
      };
    } catch (error) {
      this.logger.error('Failed to evaluate eligibility rule', error);
      return { eligible: false, reason: 'Rule evaluation error' };
    }
  }

  async evaluateQuota(
    businessTier: string,
    applicationsThisYear: number,
  ): Promise<QuotaResult> {
    try {
      const result = await this.evaluateRule('scholarship_quota', {
        businessTier,
      });

      const maxScholarships = parseInt(
        String(result.maxScholarships ?? '0'),
        10,
      );
      const withinQuota = applicationsThisYear < maxScholarships;
      const remainingQuota = Math.max(0, maxScholarships - applicationsThisYear);

      return { maxScholarships, withinQuota, remainingQuota };
    } catch (error) {
      this.logger.error('Failed to evaluate quota rule', error);
      return { maxScholarships: 0, withinQuota: false, remainingQuota: 0 };
    }
  }

  async evaluateFunding(
    industry: string,
    trainingCost: number,
  ): Promise<FundingResult> {
    try {
      const result = await this.evaluateRule('scholarship_funding', {
        industry,
        trainingCost,
      });

      const coveragePercent = parseInt(
        String(result.coveragePercent ?? '0'),
        10,
      );
      const coverageAmount = (trainingCost * coveragePercent) / 100;

      return { coveragePercent, coverageAmount };
    } catch (error) {
      this.logger.error('Failed to evaluate funding rule', error);
      return { coveragePercent: 0, coverageAmount: 0 };
    }
  }
}
