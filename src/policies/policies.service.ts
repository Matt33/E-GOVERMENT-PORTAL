import { Injectable } from '@nestjs/common';
import { ZenEngine } from '@gorules/zen-engine';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ScholarshipApplicationEntity } from '../scholarship/entities/scholarship-application.entity';
import * as fs from 'fs';
import * as path from 'path';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class EvaluatePolicyDto {
  @IsString()
  applicantId: string;

  @IsBoolean()
  isStudent: boolean;

  @IsOptional()
  @IsString()
  applicationDate?: string;
}

/** Normalize reason from rule output (strip surrounding quotes). */
function normalizeReason(r: unknown): string {
  if (r == null) return '';
  const s = String(r).replace(/^"|"$/g, '').trim();
  return s;
}

/** Application period: months 3 (Mar), 7 (Jul), 8 (Aug), 9 (Sep), 10 (Oct). */
const ELIGIBLE_MONTHS = [3, 7, 8, 9, 10];

/**
 * Evaluate eligibility in-code (same logic as rules/eligibility_policy) so we always
 * return the real reason when Zen result is missing or wrong.
 */
function evaluateEligibilityInCode(
  isStudent: boolean,
  applicationsThisYear: number,
  applicationDateStr: string,
): { eligible: boolean; reason: string } {
  if (!isStudent) {
    return { eligible: false, reason: 'Must be a student' };
  }
  if (applicationsThisYear >= 1) {
    return { eligible: false, reason: 'Already applied this year' };
  }
  let month: number;
  try {
    const d = new Date(applicationDateStr);
    month = d.getMonth() + 1; // 1-12
  } catch {
    month = new Date().getMonth() + 1;
  }
  if (!ELIGIBLE_MONTHS.includes(month)) {
    return { eligible: false, reason: 'Application period closed' };
  }
  return { eligible: true, reason: '-' };
}

/** Unwrap Zen result: may be { eligible, reason } or { [nodeId]: { eligible, reason } }. */
function unwrapRuleResult(
  result: unknown,
): { eligible?: unknown; reason?: unknown } | null {
  if (result == null || typeof result !== 'object') return null;
  const obj = result as Record<string, unknown>;
  if ('eligible' in obj && 'reason' in obj)
    return obj as { eligible?: unknown; reason?: unknown };
  const first = Object.values(obj).find(
    (v) => v != null && typeof v === 'object' && 'eligible' in (v as object),
  );
  return (first as { eligible?: unknown; reason?: unknown }) ?? null;
}

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(ScholarshipApplicationEntity)
    private readonly applicationRepo: Repository<ScholarshipApplicationEntity>,
  ) {}

  /**
   * Evaluate eligibility using rules/eligibility_policy only.
   * Input: isStudent, applicationsThisYear, applicationDate (YYYY-MM-DD).
   * Output: eligible, reason (from decision table).
   */
  async evaluatePolicy(dto: EvaluatePolicyDto) {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const applicationsThisYearCount = await this.applicationRepo.count({
      where: {
        businessId: dto.applicantId,
        createdAt: Between(startOfYear, endOfYear),
      },
    });

    const applicationDate =
      dto.applicationDate?.trim() || new Date().toISOString().split('T')[0];

    try {
      const engine = new ZenEngine();
      const rulesPath = path.join(process.cwd(), 'rules', 'eligibility_policy');
      if (!fs.existsSync(rulesPath)) {
        console.error(`Rules file not found at: ${rulesPath}`);
        return {
          eligible: false,
          reason: 'System error: Policy rules missing',
          applicationsThisYear: applicationsThisYearCount,
        };
      }
      const ruleContent = fs.readFileSync(rulesPath, 'utf-8');
      const ruleJson = JSON.parse(ruleContent) as object;
      const decision = engine.createDecision(ruleJson);

      const input = {
        isStudent: !!dto.isStudent,
        applicationsThisYear: applicationsThisYearCount,
        applicationDate,
      };
      console.log('Evaluating eligibility_policy with input:', input);

      const { result } = await decision.evaluate(input);
      console.log('eligibility_policy raw result:', JSON.stringify(result));

      const table = unwrapRuleResult(result);
      let eligible: boolean;
      let reason: string;

      if (table != null) {
        const fromRule = table.eligible === true || table.eligible === 'true';
        const rawReason = table.reason;
        if (rawReason != null && String(rawReason).trim() !== '') {
          eligible = fromRule;
          reason = normalizeReason(rawReason);
        } else {
          const fallback = evaluateEligibilityInCode(
            input.isStudent,
            input.applicationsThisYear,
            input.applicationDate,
          );
          eligible = fallback.eligible;
          reason = fallback.reason;
        }
      } else {
        const fallback = evaluateEligibilityInCode(
          input.isStudent,
          input.applicationsThisYear,
          input.applicationDate,
        );
        eligible = fallback.eligible;
        reason = fallback.reason;
      }

      return {
        eligible,
        reason,
        applicationsThisYear: applicationsThisYearCount,
      };
    } catch (e) {
      console.error('Failed to evaluate rules/eligibility_policy:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      return {
        eligible: false,
        reason: `Policy evaluation error: ${errorMessage}`,
        applicationsThisYear: applicationsThisYearCount,
      };
    }
  }
}
