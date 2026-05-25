import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Счётчик инвентарных номеров (стартовое значение 1000)
@Entity('inventory_counter')
export class InventoryCounter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'current_value', default: 999 })
  currentValue!: number;
}
