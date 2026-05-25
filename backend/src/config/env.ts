import dotenv from 'dotenv';
import path from 'path';

// Загрузка переменных окружения
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'potrologa-secret',
  databasePath: process.env.DATABASE_PATH || './data/database/potrologa.sqlite',
  documentsPath: process.env.DOCUMENTS_PATH || './data/documents',
  backupPath: process.env.BACKUP_PATH || './data/backups',
  logPath: process.env.LOG_PATH || './data/logs',
  smtp: {
    enabled: process.env.SMTP_ENABLED === 'true',
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
};
