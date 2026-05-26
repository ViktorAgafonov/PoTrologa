import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Организационная структура: Цех → Участок
@Entity('organization_locations')
export class OrganizationLocation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  workshop!: string;

  @Column({ nullable: true })
  section!: string;
}
