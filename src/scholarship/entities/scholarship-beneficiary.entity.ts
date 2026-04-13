import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScholarshipApplicationEntity } from './scholarship-application.entity';

@Entity('scholarship_beneficiaries')
export class ScholarshipBeneficiaryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'varchar' })
  employeeName: string;

  @Column({ type: 'varchar' })
  employeeNationalId: string;

  @Column({ type: 'varchar' })
  employeeRole: string;

  @Column({ type: 'varchar' })
  trainingProgram: string;

  @ManyToOne(
    () => ScholarshipApplicationEntity,
    (application) => application.beneficiaries,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'applicationId' })
  application: ScholarshipApplicationEntity;

  @CreateDateColumn()
  createdAt: Date;
}
