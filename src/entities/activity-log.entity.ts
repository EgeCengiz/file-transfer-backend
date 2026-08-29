import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LogAction } from '../common/enums/log-action.enum';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: LogAction })
  action: LogAction;

  @Column({ name: 'target_name', type: 'varchar', length: 500, nullable: true })
  targetName: string | null;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
