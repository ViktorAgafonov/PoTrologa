import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Ответственное лицо (должность обязательна, ФИО опционально)
@Entity('responsible_persons')
export class ResponsiblePerson {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  position!: string;

  @Column({ name: 'full_name', nullable: true })
  fullName!: string;
}
