import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Instrument } from './Instrument';

// Типы документов
export enum DocumentType {
  PASSPORT = 'PASSPORT',
  MANUAL = 'MANUAL',
  CERTIFICATE = 'CERTIFICATE',
  REPAIR = 'REPAIR',
  WRITEOFF = 'WRITEOFF',
  OTHER = 'OTHER',
}

// Документ, привязанный к СИ
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'instrument_id' })
  instrumentId!: number;

  @Column({ type: 'varchar' })
  type!: DocumentType;

  @Column()
  filename!: string;

  @Column()
  filepath!: string;

  @Column({ name: 'upload_date' })
  uploadDate!: string;

  @ManyToOne(() => Instrument, (i) => i.documents)
  @JoinColumn({ name: 'instrument_id' })
  instrument!: Instrument;
}
