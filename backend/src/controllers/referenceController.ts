import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { InstrumentType } from '../entities/InstrumentType';
import { InstrumentSubtype } from '../entities/InstrumentSubtype';
import { OrganizationLocation } from '../entities/OrganizationLocation';
import { Instrument } from '../entities/Instrument';

// Контроллер справочников (типы, подтипы, организации)
export class ReferenceController {
  // GET /api/v1/references/types
  async getTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await AppDataSource.getRepository(InstrumentType).find({ relations: ['subtypes'] });
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  }

  // POST /api/v1/references/types
  async createType(req: Request, res: Response, next: NextFunction) {
    try {
      const repo = AppDataSource.getRepository(InstrumentType);
      const item = repo.create(req.body);
      const saved = await repo.save(item);
      res.status(201).json({ success: true, data: saved });
    } catch (err) { next(err); }
  }

  // POST /api/v1/references/subtypes
  async createSubtype(req: Request, res: Response, next: NextFunction) {
    try {
      const repo = AppDataSource.getRepository(InstrumentSubtype);
      const item = repo.create(req.body);
      const saved = await repo.save(item);
      res.status(201).json({ success: true, data: saved });
    } catch (err) { next(err); }
  }

  // GET /api/v1/references/organizations
  async getOrganizations(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await AppDataSource.getRepository(OrganizationLocation).find();
      res.json({ success: true, data: items });
    } catch (err) { next(err); }
  }

  // POST /api/v1/references/organizations
  async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const repo = AppDataSource.getRepository(OrganizationLocation);
      const item = repo.create(req.body);
      const saved = await repo.save(item);
      res.status(201).json({ success: true, data: saved });
    } catch (err) { next(err); }
  }


  // DELETE /api/v1/references/types/:id
  async deleteType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const used = await AppDataSource.getRepository(Instrument).count({ where: { typeId: id } });
      if (used > 0) {
        res.status(400).json({ success: false, message: `Тип используется в ${used} СИ, удаление невозможно` });
        return;
      }
      await AppDataSource.getRepository(InstrumentSubtype).delete({ typeId: id });
      await AppDataSource.getRepository(InstrumentType).delete(id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/references/organizations/:id
  async deleteOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const used = await AppDataSource.getRepository(Instrument).count({ where: { organizationId: id } });
      if (used > 0) {
        res.status(400).json({ success: false, message: `Участок используется в ${used} СИ, удаление невозможно` });
        return;
      }
      await AppDataSource.getRepository(OrganizationLocation).delete(id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

}
