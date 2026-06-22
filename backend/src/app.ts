import 'reflect-metadata';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { AppDataSource } from './config/database';
import { configurePassport } from './config/passport';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/index';
import { startVerificationMonitor, updateVerificationStatuses } from './jobs/verificationMonitor';
import { startBackupJob } from './jobs/backupJob';
import { startLogCleanup } from './jobs/logCleanup';

// Создать необходимые директории
const dirs = [
  path.dirname(path.resolve(config.databasePath)),
  path.resolve(config.documentsPath),
  path.resolve(config.backupPath),
  path.resolve(config.logPath),
  path.resolve('./data/tmp'),
];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function bootstrap() {
  // Инициализация БД
  await AppDataSource.initialize();
  console.log('БД подключена');

  // Seed: создание администратора и счётчика при первом запуске
  const { User } = await import('./entities/User');
  const { InventoryCounter } = await import('./entities/InventoryCounter');
  const userRepo = AppDataSource.getRepository(User);
  const counterRepo = AppDataSource.getRepository(InventoryCounter);
  const bcrypt = await import('bcryptjs');

  const adminExists = await userRepo.findOneBy({ login: 'admin' });
  if (!adminExists) {
    // Генерируем криптографически безопасный временный пароль
    const tempPassword = Array.from({ length: 12 }, () =>
      'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'.charAt(
        Math.floor(Math.random() * 56)
      )
    ).join('');
    const hash = await bcrypt.hash(tempPassword, 10);
    await userRepo.save(userRepo.create({
      login: 'admin',
      passwordHash: hash,
      role: 'ADMIN' as any,
      email: '',
    }));
    console.log('========================================');
    console.log('Создан пользователь admin');
    console.log(`Временный пароль: ${tempPassword}`);
    console.log('Смените пароль после первого входа!');
    console.log('========================================');
  }

  const counter = await counterRepo.findOneBy({ id: 1 });
  if (!counter) {
    await counterRepo.save(counterRepo.create({ currentValue: 999 }));
  }

  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Сессии
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 часа
  }));

  // Passport
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // API
  app.use('/api/v1', apiRoutes);

  // Раздача фронтенда (SPA)
  const frontendPath = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendPath)) {
    // Assets с hash — кэшируем навсегда
    app.use('/assets', express.static(path.join(frontendPath, 'assets'), { maxAge: '1y', immutable: true }));
    // Остальные статические файлы
    app.use(express.static(frontendPath, { maxAge: '1h' }));
    // index.html — никакого кэша
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  // Глобальный обработчик ошибок
  app.use(errorHandler);

  // Обновить статусы поверок при старте
  await updateVerificationStatuses();

  // Запуск cron-задач
  startVerificationMonitor();
  startBackupJob();
  startLogCleanup();

  app.listen(config.port, () => {
    console.log(`Сервер запущен на порту ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Ошибка запуска:', err);
  process.exit(1);
});
