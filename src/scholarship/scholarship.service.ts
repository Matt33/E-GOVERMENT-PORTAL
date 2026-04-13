import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { FlowableService, FlowableTask } from '../flowable/flowable.service';
import { BusinessLicenseService } from '../business-license/business-license.service';
import { ScholarshipRulesService } from './scholarship-rules.service';
import {
  ScholarshipApplicationEntity,
  ApplicationStatus,
  BusinessTier,
  ScholarshipType,
} from './entities/scholarship-application.entity';
import { ScholarshipBeneficiaryEntity } from './entities/scholarship-beneficiary.entity';
import { ScholarshipFinancialEntity } from './entities/scholarship-financial.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { AddBeneficiariesDto } from './dto/add-beneficiaries.dto';
import { AddFinancialsDto } from './dto/add-financials.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { AdminDecisionDto } from './dto/admin-decision.dto';

@Injectable()
export class ScholarshipService {
  private readonly logger = new Logger(ScholarshipService.name);

  constructor(
    @InjectRepository(ScholarshipApplicationEntity)
    private readonly applicationRepo: Repository<ScholarshipApplicationEntity>,
    @InjectRepository(ScholarshipBeneficiaryEntity)
    private readonly beneficiaryRepo: Repository<ScholarshipBeneficiaryEntity>,
    @InjectRepository(ScholarshipFinancialEntity)
    private readonly financialRepo: Repository<ScholarshipFinancialEntity>,
    private readonly rulesService: ScholarshipRulesService,
    private readonly businessLicenseService: BusinessLicenseService,
    private readonly flowableService: FlowableService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // Citizen: Multi-step application
  // ═══════════════════════════════════════════════════════════════════

  async createDraft(
    dto: CreateApplicationDto,
    businessId: string,
  ): Promise<ScholarshipApplicationEntity> {
    await this.verifyLicenseOwnership(dto.businessLicenseId, businessId);

    const currentYear = new Date().getFullYear();

    const application = this.applicationRepo.create({
      businessId,
      businessName: dto.businessName,
      businessLicenseId: dto.businessLicenseId,
      businessTier: dto.businessTier as BusinessTier,
      industry: dto.industry,
      yearsActive: dto.yearsActive,
      fiscalYear: currentYear,
      trainingTitle: dto.trainingTitle,
      trainingProvider: dto.trainingProvider,
      scholarshipType: dto.scholarshipType as ScholarshipType,
      status: ApplicationStatus.DRAFT,
    });

    return this.applicationRepo.save(application);
  }

  async addBeneficiaries(
    applicationId: string,
    dto: AddBeneficiariesDto,
    businessId: string,
  ): Promise<ScholarshipApplicationEntity> {
    const application = await this.findOwnedApplication(
      applicationId,
      businessId,
    );

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException(
        'Beneficiaries can only be added to DRAFT applications',
      );
    }

    await this.beneficiaryRepo.delete({ applicationId });

    const beneficiaries = dto.beneficiaries.map((item) =>
      this.beneficiaryRepo.create({
        applicationId,
        employeeName: item.employeeName,
        employeeNationalId: item.employeeNationalId,
        employeeRole: item.employeeRole,
        trainingProgram: item.trainingProgram,
      }),
    );

    await this.beneficiaryRepo.save(beneficiaries);

    return this.findOne(applicationId);
  }

  async addFinancials(
    applicationId: string,
    dto: AddFinancialsDto,
    businessId: string,
  ): Promise<ScholarshipApplicationEntity> {
    const application = await this.findOwnedApplication(
      applicationId,
      businessId,
    );

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException(
        'Financials can only be added to DRAFT applications',
      );
    }

    const totalCost = dto.tuitionFee + dto.materialsCost + dto.travelCost;

    let financial = await this.financialRepo.findOne({
      where: { applicationId },
    });

    if (financial) {
      financial.tuitionFee = dto.tuitionFee;
      financial.materialsCost = dto.materialsCost;
      financial.travelCost = dto.travelCost;
      financial.totalCost = totalCost;
      financial.bankName = dto.bankName;
      financial.bankAccountNumber = dto.bankAccountNumber;
      financial.supportingDocumentPath = dto.supportingDocumentPath ?? null;
    } else {
      financial = this.financialRepo.create({
        applicationId,
        tuitionFee: dto.tuitionFee,
        materialsCost: dto.materialsCost,
        travelCost: dto.travelCost,
        totalCost,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        supportingDocumentPath: dto.supportingDocumentPath ?? null,
      });
    }

    await this.financialRepo.save(financial);

    application.trainingCost = totalCost;
    await this.applicationRepo.save(application);

    return this.findOne(applicationId);
  }

  /**
   * Step 4: Submit the application.
   * GoRules evaluations run as RECOMMENDATIONS only -- no auto-reject.
   * Status always moves to PENDING for admin review.
   */
  async submitApplication(
    applicationId: string,
    businessId: string,
  ): Promise<ScholarshipApplicationEntity> {
    const application = await this.findOwnedApplication(
      applicationId,
      businessId,
    );

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT applications can be submitted');
    }

    if (!application.beneficiaries?.length) {
      throw new BadRequestException(
        'At least one beneficiary is required before submission',
      );
    }

    if (!application.financial) {
      throw new BadRequestException(
        'Financial information is required before submission',
      );
    }

    // --- Verify business license ownership again ---
    await this.verifyLicenseOwnership(
      application.businessLicenseId,
      businessId,
    );

    // --- Verify business license status from Service 3 ---
    let licenseStatus = 'UNKNOWN';
    try {
      const license = await this.businessLicenseService.findOne(
        application.businessLicenseId,
      );
      licenseStatus = license.status === 'APPROVED' ? 'Valid' : license.status;
    } catch {
      this.logger.warn(
        `Could not verify license ${application.businessLicenseId}, defaulting to UNKNOWN`,
      );
    }
    application.licenseStatus = licenseStatus;

    // --- GoRules: Eligibility (advisory only) ---
    const eligibility = await this.rulesService.evaluateEligibility(
      licenseStatus,
      application.yearsActive,
    );
    application.eligible = eligibility.eligible;
    application.eligibilityReason = eligibility.reason;

    // --- GoRules: Quota (advisory only) ---
    const approvedThisYear = await this.countAcceptedThisYear(
      businessId,
      application.fiscalYear,
    );
    const quota = await this.rulesService.evaluateQuota(
      application.businessTier,
      approvedThisYear,
    );
    application.quotaAllowed = quota.maxScholarships;
    application.quotaUsed = approvedThisYear;

    if (!quota.withinQuota) {
      application.eligibilityReason =
        `Quota warning: ${approvedThisYear}/${quota.maxScholarships} used this fiscal year`;
    }

    // --- GoRules: Funding Match (recommendation only, admin confirms) ---
    const funding = await this.rulesService.evaluateFunding(
      application.industry,
      Number(application.trainingCost),
    );
    application.recommendedCoveragePercent = funding.coveragePercent;
    application.recommendedCoverageAmount = funding.coverageAmount;
    application.governmentCoveragePercent = null as unknown as number;
    application.governmentCoverageAmount = null as unknown as number;

    // --- Move to PENDING (no auto-reject) ---
    application.status = ApplicationStatus.PENDING;
    const saved = await this.applicationRepo.save(application);

    // --- Start Flowable workflow ---
    try {
      const process = await this.flowableService.startProcessInstance(
        'scholarship-business-process',
        {
          applicationId: saved.id,
          businessName: saved.businessName,
          businessTier: saved.businessTier,
          industry: saved.industry,
          recommendedCoverage: saved.recommendedCoveragePercent,
        },
      );
      saved.flowableProcessInstanceId = process.id;
      await this.applicationRepo.save(saved);
    } catch {
      saved.flowableProcessInstanceId = 'process-unavailable';
      await this.applicationRepo.save(saved);
    }

    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Citizen: Read
  // ═══════════════════════════════════════════════════════════════════

  async getMyRequests(
    businessId: string,
  ): Promise<ScholarshipApplicationEntity[]> {
    return this.applicationRepo.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      relations: ['beneficiaries', 'financial'],
    });
  }

  async getApplicationStatus(
    applicationId: string,
  ): Promise<Record<string, unknown>> {
    const app = await this.findOne(applicationId);
    return {
      status: app.status,
      eligible: app.eligible,
      eligibilityReason: app.eligibilityReason,
      quotaAllowed: app.quotaAllowed,
      quotaUsed: app.quotaUsed,
      recommendedCoveragePercent: app.recommendedCoveragePercent,
      recommendedCoverageAmount: app.recommendedCoverageAmount,
      governmentCoveragePercent: app.governmentCoveragePercent,
      governmentCoverageAmount: app.governmentCoverageAmount,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt,
      adminNotes: app.adminNotes,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Admin: Review workflow
  // ═══════════════════════════════════════════════════════════════════

  async getAdminPendingApplications(): Promise<
    ScholarshipApplicationEntity[]
  > {
    return this.applicationRepo.find({
      where: {
        status: In([ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW]),
      },
      order: { createdAt: 'ASC' },
      relations: ['beneficiaries', 'financial'],
    });
  }

  async startReview(
    applicationId: string,
    adminId: string,
  ): Promise<ScholarshipApplicationEntity> {
    const application = await this.findOne(applicationId);

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        'Only PENDING applications can be moved to UNDER_REVIEW',
      );
    }

    application.status = ApplicationStatus.UNDER_REVIEW;
    application.reviewedBy = adminId;
    return this.applicationRepo.save(application);
  }

  async adminDecide(
    applicationId: string,
    dto: AdminDecisionDto,
    adminId: string,
  ): Promise<ScholarshipApplicationEntity> {
    const application = await this.findOne(applicationId);

    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        'Only PENDING or UNDER_REVIEW applications can be decided',
      );
    }

    if (dto.action === 'REJECTED' && !dto.reason?.trim()) {
      throw new BadRequestException(
        'A rejection reason is mandatory when rejecting an application',
      );
    }

    // Complete Flowable task if provided
    if (dto.taskId) {
      try {
        const approved = dto.action === 'ACCEPTED';
        await this.flowableService.completeTask(dto.taskId, approved);
      } catch {
        this.logger.warn(
          'Flowable task completion failed, updating DB directly',
        );
      }
    }

    if (dto.action === 'ACCEPTED') {
      const coveragePercent =
        dto.finalCoveragePercent ?? application.recommendedCoveragePercent ?? 0;
      application.governmentCoveragePercent = coveragePercent;
      application.governmentCoverageAmount =
        (Number(application.trainingCost) * coveragePercent) / 100;
      application.status = ApplicationStatus.ACCEPTED;
    } else {
      application.status = ApplicationStatus.REJECTED;
      application.eligibilityReason = dto.reason || 'Rejected by admin';
    }

    application.adminNotes = dto.adminNotes ?? null;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();

    return this.applicationRepo.save(application);
  }

  async getSupervisorTasks(): Promise<FlowableTask[]> {
    return this.flowableService.getSupervisorTasks();
  }

  /**
   * Legacy supervisor review endpoint -- delegates to admin decide logic.
   */
  async reviewApplication(
    applicationId: string,
    dto: CompleteTaskDto,
    reviewerId: string,
  ): Promise<ScholarshipApplicationEntity> {
    const adminDto: AdminDecisionDto = {
      action: dto.action === 'APPROVED' ? 'ACCEPTED' : 'REJECTED',
      taskId: dto.taskId,
      reason: dto.reason,
    };
    return this.adminDecide(applicationId, adminDto, reviewerId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Shared
  // ═══════════════════════════════════════════════════════════════════

  async findOne(id: string): Promise<ScholarshipApplicationEntity> {
    const application = await this.applicationRepo.findOne({
      where: { id },
      relations: ['beneficiaries', 'financial'],
    });
    if (!application) {
      throw new NotFoundException(`Scholarship application '${id}' not found`);
    }
    return application;
  }

  async findAll(): Promise<ScholarshipApplicationEntity[]> {
    return this.applicationRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['beneficiaries', 'financial'],
    });
  }

  private async findOwnedApplication(
    applicationId: string,
    businessId: string,
  ): Promise<ScholarshipApplicationEntity> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId, businessId },
      relations: ['beneficiaries', 'financial'],
    });
    if (!application) {
      throw new NotFoundException(
        `Scholarship application '${applicationId}' not found or not owned by this business`,
      );
    }
    return application;
  }

  private async countAcceptedThisYear(
    businessId: string,
    fiscalYear: number,
  ): Promise<number> {
    const startOfYear = new Date(fiscalYear, 0, 1);
    const endOfYear = new Date(fiscalYear, 11, 31, 23, 59, 59);

    return this.applicationRepo.count({
      where: {
        businessId,
        status: ApplicationStatus.ACCEPTED,
        createdAt: Between(startOfYear, endOfYear),
      },
    });
  }

  private async verifyLicenseOwnership(
    licenseId: string,
    userId: string,
  ): Promise<void> {
    try {
      const license = await this.businessLicenseService.findOne(licenseId);
      if (license.citizenId !== userId) {
        throw new ForbiddenException(
          'Business license does not belong to this user',
        );
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new BadRequestException(
        `Business license '${licenseId}' not found. You must have an approved business license to apply.`,
      );
    }
  }
}
