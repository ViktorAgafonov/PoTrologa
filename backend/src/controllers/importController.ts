import { Request, Response, NextFunction } from 'express';
import { ImportService } from '../services/importService';
import { AuditService } from '../services/auditService';

const service = new ImportService();
const audit = new AuditService();

// Контроллер импорта XLSX
export class ImportController {
  // POST /api/v1/import/upload
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'XLSX файл не загружен' });
        return;
      }
      const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : {};
      const headerRow = req.body.headerRow ? parseInt(req.body.headerRow, 10) : 0;
      const result = await service.upload(req.file.path, mapping, headerRow);
      res.json({ success: true, import_id: result.importId, raw_rows: result.rawRows, header_row: result.headerRow, headers: result.headers, mapping: result.mapping });
    } catch (err) { next(err); }
  }

  // POST /api/v1/import/:id/mapping — обновить маппинг
  async updateMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const headerRow = req.body.headerRow !== undefined ? parseInt(req.body.headerRow, 10) : undefined;
      const ok = service.updateMapping(req.params.id as string, headerRow ?? 0, req.body.mapping || {});
      if (!ok) {
        res.status(404).json({ success: false, message: 'Сессия не найдена' });
        return;
      }
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  // GET /api/v1/import/:id/preview
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const preview = await service.preview(req.params.id as string);
      if (!preview) {
        res.status(404).json({ success: false, message: 'Сессия импорта не найдена' });
        return;
      }
      res.json({
        success: true,
        new_records: preview.newRecords.length,
        updated_records: preview.updateRecords.length,
        conflicts: preview.conflicts.length,
        data: preview,
      });
    } catch (err) { next(err); }
  }

  // POST /api/v1/import/:id/commit
  async commit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.commit(req.params.id as string, req.body.resolutions);
      const user = req.user as any;
      await audit.log(user?.id, 'IMPORT', 'instrument', 0);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }
}
