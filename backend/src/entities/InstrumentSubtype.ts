import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InstrumentType } from './InstrumentType';

// Подтип СИ (Лабораторные, Платформенные и т.д.)
@Entity('instrument_subtypes')
export class InstrumentSubtype {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'type_id' })
  typeId!: number;

  @Column()
  name!: string;

  @ManyToOne(() => InstrumentType, (t) => t.subtypes)
  @JoinColumn({ name: 'type_id' })
  type!: InstrumentType;
}
