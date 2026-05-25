import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

// Контроллер аутентификации
export class AuthController {
  // POST /api/v1/auth/login
  login(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        res.status(401).json({ success: false, message: info?.message || 'Ошибка авторизации' });
        return;
      }
      req.logIn(user, (err2) => {
        if (err2) return next(err2);
        res.json({
          success: true,
          user: { id: user.id, login: user.login, role: user.role, email: user.email },
        });
      });
    })(req, res, next);
  }

  // POST /api/v1/auth/logout
  logout(req: Request, res: Response): void {
    req.logout(() => {
      res.json({ success: true });
    });
  }

  // GET /api/v1/auth/me
  me(req: Request, res: Response): void {
    if (!req.isAuthenticated()) {
      res.status(401).json({ success: false, message: 'Не авторизован' });
      return;
    }
    const u = req.user as any;
    res.json({ success: true, user: { id: u.id, login: u.login, role: u.role, email: u.email } });
  }
}
