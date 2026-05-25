import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Журнал действий пользователей (неизменяемый)
@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', nullable: true })
  userId!: number;

  @Column()
  action!: string;

  @Column()
  entity!: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
