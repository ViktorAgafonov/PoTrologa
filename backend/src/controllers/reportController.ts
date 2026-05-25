import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';

const service = new ReportService();

// Контроллер отчётов
export class ReportController {
  // GET /api/v1/reports/general
  async general(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await service.general();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // GET /api/v1/reports/verifications (calibration в API)
  async verifications(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await service.verifications();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // GET /api/v1/reports/departments
  async departments(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await service.byOrganization();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}
