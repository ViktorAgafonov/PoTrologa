import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Уведомление для пользователя
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column()
  message!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
