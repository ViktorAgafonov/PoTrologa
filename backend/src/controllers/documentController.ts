import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/documentService';
import { DocumentType } from '../entities/Document';
import { AuditService } from '../services/auditService';

const service = new DocumentService();
const audit = new AuditService();

// Контроллер документов
export class DocumentController {
  // POST /api/v1/documents
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Файл не загружен' });
        return;
      }
      const docType = (req.body.type as DocumentType) || DocumentType.OTHER;
      const customFilename = req.body.filename ? String(req.body.filename) : undefined;
      const doc = await service.upload(
        Number(req.body.instrumentId) || 0,
        docType,
        req.file,
        customFilename
      );
      const user = req.user as any;
      await audit.log(user?.id, 'UPLOAD_DOC', 'document', doc.id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) { next(err); }
  }

  // GET /api/v1/documents/:id
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await service.getById(Number(req.params.id));
      if (!doc) {
        res.status(404).json({ success: false, message: 'Документ не найден' });
        return;
      }
      const filePath = service.getFilePath(doc);
      res.download(filePath, doc.filename);
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/documents/:id
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await service.remove(Number(req.params.id));
      const user = req.user as any;
      await audit.log(user?.id, 'DELETE_DOC', 'document', Number(req.params.id));
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}
