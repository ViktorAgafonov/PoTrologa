import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { AuditService } from '../services/auditService';

const service = new UserService();
const audit = new AuditService();

// Контроллер управления пользователями
export class UserController {
  // GET /api/v1/users
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await service.getAll();
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  }

  // POST /api/v1/users
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await service.create(req.body);
      const currentUser = req.user as any;
      await audit.log(currentUser?.id, 'CREATE_USER', 'user', user.id);
      res.status(201).json({ success: true, data: { id: user.id, login: user.login, role: user.role } });
    } catch (err) { next(err); }
  }

  // PUT /api/v1/users/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await service.update(Number(req.params.id), req.body);
      const currentUser = req.user as any;
      await audit.log(currentUser?.id, 'UPDATE_USER', 'user', Number(req.params.id));
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/users/:id
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user as any;
      await service.remove(Number(req.params.id), currentUser.id);
      await audit.log(currentUser.id, 'DELETE_USER', 'user', Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      if (err.message) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  }
}
