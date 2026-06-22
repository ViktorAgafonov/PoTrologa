import { Request, Response, NextFunction } from 'express';
import { WriteoffService } from '../services/writeoffService';
import { TemplateService } from '../services/templateService';
import { AppDataSource } from '../config/database';
import { Instrument } from '../entities/Instrument';
import { AuditService } from '../services/auditService';
import { In } from 'typeorm';
import { isSafeFilename } from '../utils/security';

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
      // Записать в историю каждого СИ
      if (proc) {
        for (const item of proc.items) {
          await audit.log(user?.id, 'WRITEOFF_COMPLETE', 'instrument', item.instrumentId);
        }
      }
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
      if (!isSafeFilename(templateFilename)) {
        res.status(400).json({ success: false, message: 'Некорректное имя шаблона' });
        return;
      }
      const tmplService = new TemplateService();

      // Собрать данные для подстановки
      const instrRepo = AppDataSource.getRepository(Instrument);
      const instrumentIds = proc.items.map((i) => i.instrumentId);
      const instruments = await instrRepo.find({ where: { id: In(instrumentIds) } });

      // Для docx — массив объектов (таблица); для txt — строка
      const items = instruments.map((inst, idx) => ({
        num: idx + 1,
        inventoryNumber: inst.inventoryNumber || '',
        name: inst.name || '',
        model: inst.model || '',
        serialNumber: inst.serialNumber || '',
      }));
      const instrumentTable = items
        .map((i) => {
          const sn = i.serialNumber ? ` S/N: ${i.serialNumber}` : ''
          return `${i.num}. ${i.inventoryNumber} — ${i.name} (${i.model})${sn}`
        })
        .join('\n');

      const vars = {
        procedureNumber: proc.procedureNumber || '',
        date: new Date().toLocaleDateString('ru-RU'),
        reason: proc.reason || '',
        responsiblePerson: proc.responsiblePerson || '',
        instrumentTable,
        items,
      };

      const { buffer, contentType, ext } = tmplService.render(templateFilename, vars);
      const outName = `act_${proc.procedureNumber}.${ext}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(outName)}`);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Ошибка генерации акта' });
    }
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

  // GET /api/v1/writeoff-procedures/instrument/:instrumentId — списания для СИ
  async getByInstrument(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await service.getByInstrumentId(Number(req.params.instrumentId));
      res.json({ success: true, data: list });
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/writeoff-procedures/:id — удалить (только CANCELLED)
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await service.remove(id);
      const user = req.user as any;
      await audit.log(user?.id, 'WRITEOFF_DELETE', 'writeoff_procedure', id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
