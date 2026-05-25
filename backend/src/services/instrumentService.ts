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
    type: 'type.name',
    organization: 'org.factory',
    responsible: 'resp.fullName',
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
      .leftJoinAndSelect('i.organization', 'org')
      .leftJoinAndSelect('i.responsible', 'resp');

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
      relations: ['type', 'subtype', 'organization', 'responsible', 'verifications', 'repairs', 'documents'],
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

    // Обновить статус СИ при непрохождении поверки
    if (data.result === VerificationResult.FAILED) {
      await this.repo.update(instrumentId, { status: InstrumentStatus.ACTIVE });
    }
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

  // Подсчёт статистики для дашборда
  async getDashboardStats() {
    const total = await this.repo.count();
    const expired = await this.repo.count({ where: { status: InstrumentStatus.EXPIRED } });
    const verMonth = await this.repo.count({ where: { status: InstrumentStatus.VERIFICATION_MONTH } });
    const ver14 = await this.repo.count({ where: { status: InstrumentStatus.VERIFICATION_14DAYS } });
    const repair = await this.repo.count({ where: { status: InstrumentStatus.REPAIR } });
    const writeoff = await this.repo.count({ where: { status: InstrumentStatus.WRITEOFF } });

    // Группировка по типам
    const byType = await this.repo
      .createQueryBuilder('i')
      .select('type.name', 'typeName')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('i.type', 'type')
      .groupBy('type.name')
      .getRawMany();

    // Группировка по подразделениям
    const byOrg = await this.repo
      .createQueryBuilder('i')
      .select('org.factory', 'factory')
      .addSelect('org.workshop', 'workshop')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('i.organization', 'org')
      .groupBy('org.factory')
      .addGroupBy('org.workshop')
      .getRawMany();

    return { total, expired, verMonth, ver14, repair, writeoff, byType, byOrg };
  }
}
