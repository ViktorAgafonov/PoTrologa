import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settingsService';

const service = new SettingsService();

export class SettingsController {
  // GET /api/v1/settings/writeoff-template
  async getWriteoffTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const template = await service.getWriteoffTemplate();
      const tags = service.getTags();
      res.json({ success: true, template, tags });
    } catch (err) { next(err); }
  }

  // PUT /api/v1/settings/writeoff-template
  async setWriteoffTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      await service.setWriteoffTemplate(req.body.template || '');
      res.json({ success: true });
    } catch (err) { next(err); }
  }
}
