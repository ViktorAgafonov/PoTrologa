import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Instrument } from './Instrument';

// Журнал ремонтов (не удаляется)
@Entity('repairs')
export class Repair {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'instrument_id' })
  instrumentId!: number;

  @Column({ name: 'send_date' })
  sendDate!: string;

  @Column()
  reason!: string;

  @Column({ nullable: true })
  contractor!: string;

  @Column({ nullable: true })
  result!: string;

  @Column({ name: 'return_date', nullable: true })
  returnDate!: string;

  @Column({ nullable: true })
  comments!: string;

  @ManyToOne(() => Instrument, (i) => i.repairs)
  @JoinColumn({ name: 'instrument_id' })
  instrument!: Instrument;
}
