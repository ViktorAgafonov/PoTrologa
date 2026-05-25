import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Организационная структура: Завод → Цех → Участок
@Entity('organization_locations')
export class OrganizationLocation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  factory!: string;

  @Column({ nullable: true })
  workshop!: string;

  @Column({ nullable: true })
  section!: string;
}
