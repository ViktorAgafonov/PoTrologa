import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';

const service = new NotificationService();

// Контроллер уведомлений
export class NotificationController {
  // GET /api/v1/notifications
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as any;
      const items = await service.getByUser(user.id);
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  }

  // POST /api/v1/notifications/:id/read
  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      await service.markAsRead(Number(req.params.id));
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}
