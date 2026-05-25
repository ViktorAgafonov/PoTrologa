import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Роли пользователей системы
export enum UserRole {
  ADMIN = 'ADMIN',
  METROLOGIST = 'METROLOGIST',
  VIEWER = 'VIEWER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  login!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', default: UserRole.VIEWER })
  role!: UserRole;

  @Column({ nullable: true })
  email!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
