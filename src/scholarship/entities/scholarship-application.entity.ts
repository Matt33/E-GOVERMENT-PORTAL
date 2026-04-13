import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ScholarshipBeneficiaryEntity } from './scholarship-beneficiary.entity';
import { ScholarshipFinancialEntity } from './scholarship-financial.entity';

export enum BusinessTier {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum ScholarshipType {
  EMPLOYEE_UPSKILLING = 'EMPLOYEE_UPSKILLING',
  RD_GRANT = 'RD_GRANT',
  VOCATIONAL_TRAINING = 'VOCATIONAL_TRAINING',
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity('scholarship_applications')
export class ScholarshipApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Keycloak user UUID of the business owner */
  @Column({ type: 'varchar' })
  businessId: string;

  @Column({ type: 'varchar' })
  businessName: string;

  /** UUID of the verified business license from the Business License service */
  @Column({ type: 'varchar' })
  businessLicenseId: string;

  @Column({ type: 'varchar', nullable: true })
  licenseStatus: string;

  @Column({ type: 'varchar' })
  businessTier: BusinessTier;

  @Column({ type: 'varchar' })
  industry: string;

  @Column({ type: 'int' })
  yearsActive: number;

  @Column({ type: 'int' })
  fiscalYear: number;

  @Column({ type: 'varchar', nullable: true })
  trainingTitle: string;

  @Column({ type: 'varchar', nullable: true })
  trainingProvider: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  trainingCost: number;

  @Column({ type: 'varchar' })
  scholarshipType: ScholarshipType;

  @Column({ type: 'varchar', default: ApplicationStatus.DRAFT })
  status: ApplicationStatus;

  // --- GoRules recommendation fields (set on submit, advisory only) ---

  @Column({ type: 'int', nullable: true })
  recommendedCoveragePercent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  recommendedCoverageAmount: number;

  // --- Admin-confirmed final coverage (set during review) ---

  @Column({ type: 'int', nullable: true })
  governmentCoveragePercent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  governmentCoverageAmount: number;

  // --- GoRules eligibility/quota snapshot ---

  @Column({ type: 'boolean', nullable: true })
  eligible: boolean;

  @Column({ type: 'varchar', nullable: true })
  eligibilityReason: string;

  @Column({ type: 'int', nullable: true })
  quotaAllowed: number;

  @Column({ type: 'int', nullable: true })
  quotaUsed: number;

  // --- Admin review metadata ---

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  // --- Flowable ---

  @Column({ type: 'varchar', nullable: true })
  flowableProcessInstanceId: string | null;

  // --- Relations ---

  @OneToMany(
    () => ScholarshipBeneficiaryEntity,
    (beneficiary) => beneficiary.application,
    { cascade: true, eager: true },
  )
  beneficiaries: ScholarshipBeneficiaryEntity[];

  @OneToOne(
    () => ScholarshipFinancialEntity,
    (financial) => financial.application,
    { cascade: true, eager: true },
  )
  financial: ScholarshipFinancialEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
