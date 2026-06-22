import { AppDataSource } from '../config/database';
import { InventoryCounter } from '../entities/InventoryCounter';

// Сервис генерации инвентарных номеров (счётчик, не MAX)
export class InventoryService {
  private repo = AppDataSource.getRepository(InventoryCounter);

  // Получить следующий инвентарный номер (атомарно через транзакцию)
  async getNextNumber(): Promise<string> {
    return await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InventoryCounter);
      // Блокировка через pessimistic_write
      let counter = await repo.findOne({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      if (!counter) {
        counter = repo.create({ id: 1, currentValue: 999 });
        counter = await repo.save(counter);
      }
      counter.currentValue += 1;
      await repo.save(counter);
      return String(counter.currentValue);
    });
  }

  // Обновить счётчик если импортированное значение больше текущего
  async syncWithImported(value: number): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InventoryCounter);
      let counter = await repo.findOne({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      if (!counter) {
        counter = repo.create({ id: 1, currentValue: value });
        await repo.save(counter);
        return;
      }
      if (value > counter.currentValue) {
        counter.currentValue = value;
        await repo.save(counter);
      }
    });
  }
}
