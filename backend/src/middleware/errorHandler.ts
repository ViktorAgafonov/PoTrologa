import { Request, Response, NextFunction } from 'express';

const isDev = process.env.NODE_ENV === 'development';

// Глобальный обработчик ошибок — формат { success: false, message: "..." }
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(`[ERROR] ${err.message}`);
  // В продакшене не отправляем детали ошибок клиенту
  const message = isDev ? err.message : 'Внутренняя ошибка сервера';
  res.status(500).json({ success: false, message: message || 'Внутренняя ошибка сервера' });
}
