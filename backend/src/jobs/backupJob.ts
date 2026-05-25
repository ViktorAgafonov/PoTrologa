import cron from 'node-cron';
import { BackupService } from '../services/backupService';

const service = new BackupService();

// Ежедневное автоматическое резервное копирование (02:00)
// Удаление бэкапов старше 180 дней
export function startBackupJob(): void {
  cron.schedule('0 2 * * *', async () => {
    try {
      const filename = await service.create('auto');
      console.log(`[CRON] Бэкап создан: ${filename}`);
      service.cleanOld(180);
      console.log('[CRON] Очистка старых бэкапов выполнена');
    } catch (err) {
      console.error('[CRON] Ошибка автобэкапа:', err);
    }
  });
}
