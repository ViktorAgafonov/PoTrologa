import { Request, Response, NextFunction } from 'express';
import { InstrumentService } from '../services/instrumentService';
import { AuditService } from '../services/auditService';

const service = new InstrumentService();
const audit = new AuditService();

// Контроллер средств измерения
export class InstrumentController {
  // GET /api/v1/instruments
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.getAll({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
        search: req.query.search as string,
        typeId: Number(req.query.type) || undefined,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }

  // GET /api/v1/instruments/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.getById(Number(req.params.id));
      if (!item) {
        res.status(404).json({ success: false, message: 'СИ не найдено' });
        return;
      }
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  }

  // POST /api/v1/instruments
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.create(req.body);
      const user = req.user as any;
      await audit.log(user?.id, 'CREATE', 'instrument', item.id);
      res.status(201).json({ success: true, data: item });
    } catch (err) { next(err); }
  }

  // PUT /api/v1/instruments/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.update(Number(req.params.id), req.body);
      const user = req.user as any;
      await audit.log(user?.id, 'UPDATE', 'instrument', Number(req.params.id));
      res.json({ success: true, data: item });
    } catch (err) { next(err); }
  }

  // POST /api/v1/instruments/:id/verification
  async addVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await service.addVerification(Number(req.params.id), req.body);
      const user = req.user as any;
      await audit.log(user?.id, 'VERIFICATION', 'instrument', Number(req.params.id));
      res.status(201).json({ success: true, data: record });
    } catch (err) { next(err); }
  }

  // GET /api/v1/instruments/:id/verification
  async getVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await service.getVerifications(Number(req.params.id));
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  }

  // POST /api/v1/instruments/:id/repair
  async addRepair(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await service.addRepair(Number(req.params.id), req.body);
      const user = req.user as any;
      await audit.log(user?.id, 'REPAIR', 'instrument', Number(req.params.id));
      res.status(201).json({ success: true, data: record });
    } catch (err) { next(err); }
  }

  // GET /api/v1/instruments/:id/repairs
  async getRepairs(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await service.getRepairs(Number(req.params.id));
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  }

  // GET /api/v1/instruments/dashboard
  async dashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await service.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (err) { next(err); }
  }
}
