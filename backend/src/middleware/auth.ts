import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../entities/User';

// Проверка аутентификации
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Требуется авторизация' });
}

// Проверка роли пользователя
export function hasRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ success: false, message: 'Требуется авторизация' });
      return;
    }
    const user = req.user as any;
    if (!roles.includes(user.role)) {
      res.status(403).json({ success: false, message: 'Недостаточно прав' });
      return;
    }
    next();
  };
}
