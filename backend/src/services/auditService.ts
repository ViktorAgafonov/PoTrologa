import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';

// Запись действий пользователей
export class AuditService {
  private repo = AppDataSource.getRepository(AuditLog);

  async log(userId: number | null, action: string, entity: string, entityId?: number): Promise<void> {
    const entry = this.repo.create({
      userId: userId || 0,
      action,
      entity,
      entityId: entityId || 0,
    });
    await this.repo.save(entry);
  }

  async getAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit };
  }

  // Получить историю по конкретной сущности
  async getByEntity(entity: string, entityId: number) {
    return this.repo.find({
      where: { entity, entityId },
      order: { createdAt: 'DESC' },
    });
  }
}
