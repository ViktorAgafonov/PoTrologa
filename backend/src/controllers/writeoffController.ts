import { Request, Response, NextFunction } from 'express';
import { WriteoffService } from '../services/writeoffService';
import { TemplateService } from '../services/templateService';
import { AppDataSource } from '../config/database';
import { Instrument } from '../entities/Instrument';
import { AuditService } from '../services/auditService';

const service = new WriteoffService();
const audit = new AuditService();

// Контроллер процедур списания
export class WriteoffController {
  // POST /api/v1/writeoff-procedures — создать процедуру
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const proc = await service.create(req.body);
      const user = req.user as any;
      await audit.log(user?.id, 'WRITEOFF_CREATE', 'writeoff_procedure', proc!.id);
      res.status(201).json({ success: true, data: proc });
    } catch (err) { next(err); }
  }

  // GET /api/v1/writeoff-procedures — список
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await service.getAll();
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  }

  // GET /api/v1/writeoff-procedures/:id — детали
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const proc = await service.getById(Number(req.params.id));
      if (!proc) {
        res.status(404).json({ success: false, message: 'Процедура не найдена' });
        return;
      }
      res.json({ success: true, data: proc });
    } catch (err) { next(err); }
  }

  // POST /api/v1/writeoff-procedures/:id/send-to-approval
  async sendToApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const proc = await service.sendToApproval(Number(req.params.id));
      const user = req.user as any;
      await audit.log(user?.id, 'WRITEOFF_SEND_APPROVAL', 'writeoff_procedure', Number(req.params.id));
      res.json({ success: true, data: proc });
    } catch (err) { next(err); }
  }

  // POST /api/v1/writeoff-procedures/:id/upload-scan — загрузить скан и завершить
  async uploadScan(req: Request, res: Response, next: NextFunction) {
    try {
      const proc = await service.uploadScan(Number(req.params.id), Number(req.body.documentId));
      const user = req.user as any;
      await audit.log(user?.id, 'WRITEOFF_COMPLETE', 'writeoff_procedure', Number(req.params.id));
      res.json({ success: true, data: proc });
    } catch (err) { next(err); }
  }

  // POST /api/v1/writeoff-procedures/:id/generate-act — генерация акта из шаблона
  async generateAct(req: Request, res: Response, next: NextFunction) {
    try {
      const proc = await service.getById(Number(req.params.id));
      if (!proc) {
        res.status(404).json({ success: false, message: 'Процедура не найдена' });
        return;
      }
      const templateFilename = req.body.template as string;
      const tmplService = new TemplateService();
      const content = tmplService.getContent(templateFilename);
      if (!content) {
        res.status(404).json({ success: false, message: 'Шаблон не найден' });
        return;
      }
      // Собрать данные для подстановки
      const instrRepo = AppDataSource.getRepository(Instrument);
      const instrumentIds = proc.items.map((i) => i.instrumentId);
      const instruments = await instrRepo.findByIds(instrumentIds);
      const instrumentTable = instruments
        .map((inst, idx) => `${idx + 1}. ${inst.inventoryNumber} — ${inst.name} (${inst.model || ''}) S/N: ${inst.serialNumber || ''}`)
        .join('\n');
      const rendered = tmplService.render(content, {
        procedureNumber: proc.procedureNumber,
        date: new Date().toLocaleDateString('ru-RU'),
        reason: proc.reason || '',
        instrumentTable,
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="act_${proc.procedureNumber}.txt"`);
      res.send(rendered);
    } catch (err) { next(err); }
  }

  // POST /api/v1/writeoff-procedures/:id/cancel
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const proc = await service.cancel(Number(req.params.id));
      const user = req.user as any;
      await audit.log(user?.id, 'WRITEOFF_CANCEL', 'writeoff_procedure', Number(req.params.id));
      res.json({ success: true, data: proc });
    } catch (err) { next(err); }
  }
}
