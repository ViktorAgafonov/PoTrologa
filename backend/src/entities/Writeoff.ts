import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Instrument } from './Instrument';
import { Document } from './Document';

// Статусы процедуры списания
export enum WriteoffStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  WAITING_SCAN = 'WAITING_SCAN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Процедура списания (группа приборов)
@Entity('writeoff_procedures')
export class WriteoffProcedure {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'procedure_number', unique: true })
  procedureNumber!: string;

  @Column({ type: 'varchar', default: WriteoffStatus.DRAFT })
  status!: WriteoffStatus;

  @Column()
  reason!: string;

  @Column({ name: 'responsible_person', nullable: true })
  responsiblePerson!: string;

  @Column({ name: 'scan_document_id', nullable: true })
  scanDocumentId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt!: string;

  @OneToMany(() => WriteoffProcedureItem, (item) => item.procedure)
  items!: WriteoffProcedureItem[];

  @OneToMany(() => WriteoffApproval, (a) => a.procedure)
  approvals!: WriteoffApproval[];

  @ManyToOne(() => Document, { nullable: true })
  @JoinColumn({ name: 'scan_document_id' })
  scanDocument!: Document | null;
}

// Позиция в процедуре списания (привязка к конкретному СИ)
@Entity('writeoff_procedure_items')
export class WriteoffProcedureItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'procedure_id' })
  procedureId!: number;

  @Column({ name: 'instrument_id' })
  instrumentId!: number;

  @Column({ nullable: true })
  note!: string;

  @ManyToOne(() => WriteoffProcedure, (p) => p.items)
  @JoinColumn({ name: 'procedure_id' })
  procedure!: WriteoffProcedure;

  @ManyToOne(() => Instrument)
  @JoinColumn({ name: 'instrument_id' })
  instrument!: Instrument;
}

// Согласования процедуры списания
@Entity('writeoff_approvals')
export class WriteoffApproval {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'procedure_id' })
  procedureId!: number;

  @Column({ name: 'approver_name' })
  approverName!: string;

  @Column({ name: 'approver_position' })
  approverPosition!: string;

  @Column({ nullable: true, default: false })
  approved!: boolean;

  @Column({ nullable: true })
  comment!: string;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt!: string;

  @ManyToOne(() => WriteoffProcedure, (p) => p.approvals)
  @JoinColumn({ name: 'procedure_id' })
  procedure!: WriteoffProcedure;
}
