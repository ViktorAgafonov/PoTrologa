import { Entity, PrimaryColumn, Column } from 'typeorm';

// Системные настройки (key/value)
@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key!: string;

  @Column({ type: 'text' })
  value!: string;
}

// Счётчики номеров процедур списания (с периодическим сбросом)
@Entity('writeoff_counters')
export class WriteoffCounter {
  // Ключ периода: например '2026-05-26' (день), '2026-W21' (неделя), '2026-05' (месяц), '2026-Q2' (квартал), '2026' (год), 'all' (без сброса)
  @PrimaryColumn()
  periodKey!: string;

  @Column()
  value!: number;
}
