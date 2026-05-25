import { AppDataSource } from '../config/database';
import { InventoryCounter } from '../entities/InventoryCounter';

// Сервис генерации инвентарных номеров (счётчик, не MAX)
export class InventoryService {
  private repo = AppDataSource.getRepository(InventoryCounter);

  // Получить следующий инвентарный номер (атомарно)
  async getNextNumber(): Promise<string> {
    let counter = await this.repo.findOneBy({ id: 1 });
    if (!counter) {
      counter = this.repo.create({ currentValue: 999 });
      counter = await this.repo.save(counter);
    }
    counter.currentValue += 1;
    await this.repo.save(counter);
    return String(counter.currentValue);
  }

  // Обновить счётчик если импортированное значение больше текущего
  async syncWithImported(value: number): Promise<void> {
    let counter = await this.repo.findOneBy({ id: 1 });
    if (!counter) {
      counter = this.repo.create({ currentValue: value });
      await this.repo.save(counter);
      return;
    }
    if (value > counter.currentValue) {
      counter.currentValue = value;
      await this.repo.save(counter);
    }
  }
}
