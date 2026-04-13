import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ScholarshipApplicationEntity } from './scholarship-application.entity';

@Entity('scholarship_financials')
export class ScholarshipFinancialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  tuitionFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  materialsCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  travelCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalCost: number;

  @Column({ type: 'varchar' })
  bankName: string;

  @Column({ type: 'varchar' })
  bankAccountNumber: string;

  @Column({ type: 'varchar', nullable: true })
  supportingDocumentPath: string | null;

  @OneToOne(
    () => ScholarshipApplicationEntity,
    (application) => application.financial,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'applicationId' })
  application: ScholarshipApplicationEntity;
}
