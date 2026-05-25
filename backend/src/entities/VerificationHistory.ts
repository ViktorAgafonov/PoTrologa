import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Instrument } from './Instrument';

// Результат поверки
export enum VerificationResult {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

// История поверок СИ (не удаляется)
@Entity('verification_history')
export class VerificationHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'instrument_id' })
  instrumentId!: number;

  @Column({ name: 'verification_date' })
  verificationDate!: string;

  @Column({ name: 'next_verification_date', nullable: true })
  nextVerificationDate!: string;

  @Column({ name: 'certificate_number', nullable: true })
  certificateNumber!: string;

  @Column({ nullable: true })
  organization!: string;

  @Column({ type: 'varchar' })
  result!: VerificationResult;

  @Column({ name: 'document_id', nullable: true })
  documentId!: number;

  @ManyToOne(() => Instrument, (i) => i.verifications)
  @JoinColumn({ name: 'instrument_id' })
  instrument!: Instrument;
}
