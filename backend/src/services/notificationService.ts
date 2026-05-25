import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';

// Сервис уведомлений
export class NotificationService {
  private repo = AppDataSource.getRepository(Notification);

  async create(userId: number, message: string, type: string) {
    const n = this.repo.create({ userId, message, type });
    return this.repo.save(n);
  }

  async getByUser(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAsRead(id: number) {
    await this.repo.update(id, { isRead: true });
  }
}
