/* eslint-disable */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('business_licenses')
export class BusinessLicenseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  ownerName: string;

  @Column({ type: 'varchar' })
  businessName: string;

  @Column({ type: 'varchar' })
  nationalId: string;

  @Column({ type: 'varchar' })
  businessType: string; // RETAIL, SERVICE, MANUFACTURING, TECH

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string; // PENDING, APPROVED, REJECTED

  @Column({ type: 'varchar' })
  citizenId: string;

  @Column({ type: 'varchar', nullable: true })
  flowableTaskId: string | null;

  @Column({ type: 'varchar', nullable: true })
  flowableProcessInstanceId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
