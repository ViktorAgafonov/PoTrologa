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
    productionYear: 'i.productionYear',
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
    // Вычислить nextVerificationDate по lastVerificationDate + интервал
    if (data.lastVerificationDate && !data.nextVerificationDate) {
      const months = data.verificationIntervalMonths || 12;
      const d = new Date(data.lastVerificationDate);
      d.setMonth(d.getMonth() + months);
      data.nextVerificationDate = d.toISOString().split('T')[0];
    }
    // Установить статус по дате следующей поверки
    if (data.nextVerificationDate) {
      const now = new Date();
      const next = new Date(data.nextVerificationDate);
      const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (next < now) data.status = InstrumentStatus.EXPIRED;
      else if (next <= in14) data.status = InstrumentStatus.VERIFICATION_14DAYS;
      else if (next <= in30) data.status = InstrumentStatus.VERIFICATION_MONTH;
      else data.status = InstrumentStatus.ACTIVE;
    }
    const instrument = this.repo.create(data);
    return this.repo.save(instrument);
  }

  // Обновить СИ (запрещено менять статус напрямую на WRITEOFF)
  async update(id: number, data: Partial<Instrument>) {
    // Пересчитать nextVerificationDate если изменили lastVerificationDate
    if (data.lastVerificationDate) {
      const existing = await this.repo.findOneBy({ id });
      const months = data.verificationIntervalMonths || existing?.verificationIntervalMonths || 12;
      const d = new Date(data.lastVerificationDate);
      d.setMonth(d.getMonth() + months);
      data.nextVerificationDate = d.toISOString().split('T')[0];
      // Пересчитать статус
      const now = new Date();
      const next = new Date(data.nextVerificationDate);
      const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (next < now) data.status = InstrumentStatus.EXPIRED;
      else if (next <= in14) data.status = InstrumentStatus.VERIFICATION_14DAYS;
      else if (next <= in30) data.status = InstrumentStatus.VERIFICATION_MONTH;
      else data.status = InstrumentStatus.ACTIVE;
    }
    await this.repo.update(id, data);
    return this.getById(id);
  }

  // Добавить запись поверки
  async addVerification(instrumentId: number, data: Partial<VerificationHistory>) {
    data.instrumentId = instrumentId;

    // Если nextVerificationDate не указан — вычислить по интервалу
    if (!data.nextVerificationDate && data.verificationDate) {
      const inst = await this.repo.findOneBy({ id: instrumentId });
      const months = inst?.verificationIntervalMonths || 12;
      const d = new Date(data.verificationDate);
      d.setMonth(d.getMonth() + months);
      data.nextVerificationDate = d.toISOString().split('T')[0];
    }

    const record = this.verRepo.create(data);
    const saved = await this.verRepo.save(record);

    // Обновить даты поверки на карточке СИ и пересчитать статус
    const now = new Date();
    const nextDate = data.nextVerificationDate ? new Date(data.nextVerificationDate) : null;
    let newStatus: InstrumentStatus = InstrumentStatus.ACTIVE;

    if (data.result === VerificationResult.FAILED) {
      newStatus = InstrumentStatus.EXPIRED;
    } else if (nextDate) {
      const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (nextDate < now) newStatus = InstrumentStatus.EXPIRED;
      else if (nextDate <= in14) newStatus = InstrumentStatus.VERIFICATION_14DAYS;
      else if (nextDate <= in30) newStatus = InstrumentStatus.VERIFICATION_MONTH;
    }

    await this.repo.update(instrumentId, {
      lastVerificationDate: data.verificationDate as any,
      nextVerificationDate: data.nextVerificationDate as any,
      status: newStatus,
    });
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
