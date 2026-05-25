import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { InstrumentSubtype } from './InstrumentSubtype';

// Тип средства измерения (Весы, Термометры, Манометры и т.д.)
@Entity('instrument_types')
export class InstrumentType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @OneToMany(() => InstrumentSubtype, (s) => s.type)
  subtypes!: InstrumentSubtype[];
}
