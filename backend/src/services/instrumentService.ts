import { AppDataSource } from '../config/database';
import { Instrument, InstrumentStatus } from '../entities/Instrument';
import { VerificationHistory, VerificationResult } from '../entities/VerificationHistory';
import { Repair } from '../entities/Repair';
import { InventoryService } from './inventoryService';

const inventoryService = new InventoryService();

// Сервис управления средствами измерения
export class InstrumentService {
  private repo = AppDataSource.getRepository(Instrument);
  private verRepo = AppDataSource.getRepository(VerificationHistory);
  private repairRepo = AppDataSource.getRepository(Repair);

  // Допустимые поля сортировки (property names, не column names)
  private static SORT_FIELDS: Record<string, string> = {
    inventoryNumber: 'i.inventoryNumber',
    name: 'i.name',
    serialNumber: 'i.serialNumber',
    status: 'i.status',
    createdAt: 'i.createdAt',
    lastVerificationDate: 'i.lastVerificationDate',
    nextVerificationDate: 'i.nextVerificationDate',
    type: 'type.name',
    organization: 'org.workshop',
  };

  // Список СИ с фильтрацией, поиском, сортировкой и пагинацией
  async getAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    typeId?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.type', 'type')
      .leftJoinAndSelect('i.subtype', 'subtype')
      .leftJoinAndSelect('i.organization', 'org');

    if (params.search) {
      qb.andWhere(
        '(i.name LIKE :s OR i.inventoryNumber LIKE :s OR i.serialNumber LIKE :s OR i.model LIKE :s)',
        { s: `%${params.search}%` }
      );
    }
    if (params.typeId) {
      qb.andWhere('i.typeId = :typeId', { typeId: params.typeId });
    }
    if (params.status) {
      qb.andWhere('i.status = :status', { status: params.status });
    }

    const sortCol = InstrumentService.SORT_FIELDS[params.sortBy || ''] || 'i.id';
    const sortDir = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortCol, sortDir).skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  // Получить карточку СИ по ID
  async getById(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: ['type', 'subtype', 'organization', 'verifications', 'repairs', 'documents'],
    });
  }

  // Создать новое СИ (автогенерация инвентарного номера)
  async create(data: Partial<Instrument>) {
    if (!data.inventoryNumber) {
      data.inventoryNumber = await inventoryService.getNextNumber();
    }
    const instrument = this.repo.create(data);
    return this.repo.save(instrument);
  }

  // Обновить СИ (запрещено менять статус напрямую на WRITEOFF)
  async update(id: number, data: Partial<Instrument>) {
    await this.repo.update(id, data);
    return this.getById(id);
  }

  // Добавить запись поверки
  async addVerification(instrumentId: number, data: Partial<VerificationHistory>) {
    data.instrumentId = instrumentId;
    const record = this.verRepo.create(data);
    const saved = await this.verRepo.save(record);

    // Обновить даты поверки на карточке СИ
    const update: Partial<Instrument> = {
      lastVerificationDate: data.verificationDate as any,
      nextVerificationDate: data.nextVerificationDate as any,
    };

    // Обновить статус СИ при непрохождении поверки
    if (data.result === VerificationResult.FAILED) {
      update.status = InstrumentStatus.ACTIVE;
    }
    await this.repo.update(instrumentId, update);
    return saved;
  }

  // Получить историю поверок
  async getVerifications(instrumentId: number) {
    return this.verRepo.find({
      where: { instrumentId },
      order: { verificationDate: 'DESC' },
    });
  }

  // Перевести в ремонт
  async addRepair(instrumentId: number, data: Partial<Repair>) {
    data.instrumentId = instrumentId;
    const record = this.repairRepo.create(data);
    const saved = await this.repairRepo.save(record);
    await this.repo.update(instrumentId, { status: InstrumentStatus.REPAIR });
    return saved;
  }

  // Получить историю ремонтов
  async getRepairs(instrumentId: number) {
    return this.repairRepo.find({
      where: { instrumentId },
      order: { sendDate: 'DESC' },
    });
  }

}
