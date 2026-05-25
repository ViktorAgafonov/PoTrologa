import { Request, Response, NextFunction } from 'express';

// Логирование HTTP-запросов: метод, путь, статус, время выполнения
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    console.log(line);
  });
  next();
}
