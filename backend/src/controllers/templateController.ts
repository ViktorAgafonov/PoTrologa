import { Request, Response, NextFunction } from 'express';
import { TemplateService } from '../services/templateService';

const service = new TemplateService();

// Контроллер шаблонов актов
export class TemplateController {
  // GET /api/v1/templates — список шаблонов
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const list = service.getAll();
      res.json({ success: true, data: list });
    } catch (err) { next(err); }
  }

  // POST /api/v1/templates — загрузить шаблон
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Файл не загружен' });
        return;
      }
      const filename = service.upload(req.file);
      res.status(201).json({ success: true, filename });
    } catch (err) { next(err); }
  }

  // GET /api/v1/templates/:filename — скачать шаблон
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = req.params.filename as string;
      const fp = service.getFilePath(filename);
      res.download(fp, filename);
    } catch (err) { next(err); }
  }

  // GET /api/v1/templates/:filename/content — получить содержимое (для редактора)
  async getContent(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = req.params.filename as string;
      const content = service.getContent(filename);
      if (content === null) {
        res.status(404).json({ success: false, message: 'Шаблон не найден' });
        return;
      }
      res.type('text/plain').send(content);
    } catch (err) { next(err); }
  }

  // PUT /api/v1/templates/:filename — обновить содержимое
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      service.saveContent(req.params.filename as string, req.body.content);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/templates/:filename — удалить
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      service.remove(req.params.filename as string);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}
