import { Request, Response, NextFunction } from 'express';

// Глобальный обработчик ошибок — формат { success: false, message: "..." }
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ success: false, message: err.message || 'Внутренняя ошибка сервера' });
}
