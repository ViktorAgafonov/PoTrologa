import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../services/backupService';
import { AuditService } from '../services/auditService';
import { isSafeFilename } from '../utils/security';

const service = new BackupService();
const audit = new AuditService();

// Контроллер резервного копирования
export class BackupController {
  // POST /api/v1/backups/create
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = await service.create('manual');
      const user = req.user as any;
      await audit.log(user?.id, 'BACKUP_CREATE', 'backup', 0);
      res.json({ success: true, filename });
    } catch (err) { next(err); }
  }

  // GET /api/v1/backups
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const list = service.getAll();
      res.json({ success: true, data: list });
    } catch (err) { next(err); }
  }

  // GET /api/v1/backups/:id (скачать файл)
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = req.params.id as string;
      if (!isSafeFilename(filename)) {
        res.status(400).json({ success: false, message: 'Некорректное имя файла' });
        return;
      }
      const filePath = service.getFilePath(filename);
      res.download(filePath, filename);
    } catch (err) { next(err); }
  }

  // POST /api/v1/backups/restore (заглушка — восстановление требует перезапуска)
  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      // Перед восстановлением — защитный бэкап
      await service.create('preupdate');
      const user = req.user as any;
      await audit.log(user?.id, 'BACKUP_RESTORE', 'backup', 0);
      res.json({ success: true, message: 'Восстановление инициировано. Требуется перезапуск сервиса.' });
    } catch (err) { next(err); }
  }
}
