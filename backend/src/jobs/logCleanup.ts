import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

// Еженедельная очистка логов старше 30 дней (воскресенье, 03:00)
export function startLogCleanup(): void {
  cron.schedule('0 3 * * 0', () => {
    try {
      const logDir = path.resolve(config.logPath);
      if (!fs.existsSync(logDir)) return;

      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(logDir);
      for (const f of files) {
        const fp = path.join(logDir, f);
        const stats = fs.statSync(fp);
        if (stats.mtime.getTime() < cutoff) {
          fs.unlinkSync(fp);
        }
      }
      console.log('[CRON] Очистка логов выполнена');
    } catch (err) {
      console.error('[CRON] Ошибка очистки логов:', err);
    }
  });
}
