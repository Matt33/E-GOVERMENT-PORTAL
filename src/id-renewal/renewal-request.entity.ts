/* eslint-disable */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('renewal_requests')
export class RenewalRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar' })
  nationalId: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  citizenId: string | null;

  @Column({ type: 'varchar', nullable: true })
  workflowId: string | null;

  @Column({ type: 'varchar', nullable: true })
  flowableTaskId: string | null;

  @Column({ type: 'varchar', nullable: true })
  flowableProcessInstanceId: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn()
  submittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
