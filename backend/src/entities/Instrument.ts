import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InstrumentType } from './InstrumentType';
import { InstrumentSubtype } from './InstrumentSubtype';
import { OrganizationLocation } from './OrganizationLocation';
import { VerificationHistory } from './VerificationHistory';
import { Repair } from './Repair';
import { Document } from './Document';

// Статусы средства измерения
export enum InstrumentStatus {
  ACTIVE = 'Действующее',
  VERIFICATION_MONTH = 'Поверка через 30 дн.',
  VERIFICATION_14DAYS = 'Поверка через 14 дн.',
  EXPIRED = 'Просрочено',
  REPAIR = 'В ремонте',
  WRITEOFF = 'Списано',
}

// Средство измерения — основная сущность системы
@Entity('instruments')
export class Instrument {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'inventory_number', unique: true })
  inventoryNumber!: string;

  @Column({ name: 'serial_number', nullable: true })
  serialNumber!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  model!: string;

  @Column({ nullable: true })
  manufacturer!: string;

  @Column({ name: 'accuracy_class', nullable: true })
  accuracyClass!: string;

  @Column({ name: 'measurement_range', nullable: true })
  measurementRange!: string;

  @Column({ name: 'graduation_value', nullable: true })
  graduationValue!: string;

  @Column({ name: 'production_year', nullable: true })
  productionYear!: string;

  @Column({ name: 'start_date', nullable: true })
  startDate!: string;

  @Column({ name: 'location', nullable: true })
  location!: string;

  @Column({ name: 'type_id', nullable: true })
  typeId!: number;

  @Column({ name: 'subtype_id', nullable: true })
  subtypeId!: number;

  @Column({ name: 'organization_id', nullable: true })
  organizationId!: number;


  @Column({ name: 'verification_interval_months', nullable: true })
  verificationIntervalMonths!: number;

  @Column({ name: 'last_verification_date', nullable: true })
  lastVerificationDate!: string;

  @Column({ name: 'next_verification_date', nullable: true })
  nextVerificationDate!: string;

  @Column({ type: 'varchar', default: InstrumentStatus.ACTIVE })
  status!: InstrumentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Связи
  @ManyToOne(() => InstrumentType, { nullable: true })
  @JoinColumn({ name: 'type_id' })
  type!: InstrumentType;

  @ManyToOne(() => InstrumentSubtype, { nullable: true })
  @JoinColumn({ name: 'subtype_id' })
  subtype!: InstrumentSubtype;

  @ManyToOne(() => OrganizationLocation, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationLocation;


  @OneToMany(() => VerificationHistory, (v) => v.instrument)
  verifications!: VerificationHistory[];

  @OneToMany(() => Repair, (r) => r.instrument)
  repairs!: Repair[];

  @OneToMany(() => Document, (d) => d.instrument)
  documents!: Document[];
}
