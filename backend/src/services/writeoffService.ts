import { AppDataSource } from '../config/database';
import { WriteoffProcedure, WriteoffProcedureItem, WriteoffStatus } from '../entities/Writeoff';
import { Instrument, InstrumentStatus } from '../entities/Instrument';
import { SettingsService } from './settingsService';

const settingsService = new SettingsService();

// Сервис процедуры списания СИ
export class WriteoffService {
  private procRepo = AppDataSource.getRepository(WriteoffProcedure);
  private itemRepo = AppDataSource.getRepository(WriteoffProcedureItem);
  private instrRepo = AppDataSource.getRepository(Instrument);

  // Создать процедуру списания (DRAFT)
  async create(data: { reason: string; responsiblePerson?: string; instrumentIds: number[] }) {
    const procedureNumber = await settingsService.generateWriteoffNumber();
    const proc = this.procRepo.create({
      procedureNumber,
      reason: data.reason,
      responsiblePerson: data.responsiblePerson || '',
      status: WriteoffStatus.DRAFT,
    });
    const saved = await this.procRepo.save(proc);

    // Добавить позиции
    for (const instrumentId of data.instrumentIds) {
      const item = this.itemRepo.create({ procedureId: saved.id, instrumentId });
      await this.itemRepo.save(item);
    }

    return this.getById(saved.id);
  }

  // Получить процедуру по ID с позициями
  async getById(id: number) {
    return this.procRepo.findOne({
      where: { id },
      relations: ['items', 'items.instrument', 'scanDocument'],
    });
  }

  // Список всех процедур
  async getAll() {
    return this.procRepo.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  // Перевести в ожидание скана (акт напечатан)
  async sendToApproval(id: number) {
    await this.procRepo.update(id, { status: WriteoffStatus.WAITING_SCAN });
    return this.getById(id);
  }

  // Загрузить скан подписанного акта и завершить процедуру
  async uploadScan(id: number, documentId: number) {
    await this.procRepo.update(id, {
      scanDocumentId: documentId,
      status: WriteoffStatus.COMPLETED,
      completedAt: new Date().toISOString(),
    });

    // Перевести все СИ из процедуры в статус WRITEOFF
    const proc = await this.getById(id);
    if (proc) {
      for (const item of proc.items) {
        await this.instrRepo.update(item.instrumentId, { status: InstrumentStatus.WRITEOFF });
      }
    }
    return this.getById(id);
  }

  // Отменить процедуру
  async cancel(id: number) {
    await this.procRepo.update(id, { status: WriteoffStatus.CANCELLED });
    return this.getById(id);
  }

  // Найти процедуры списания, содержащие указанный инструмент
  async getByInstrumentId(instrumentId: number) {
    const items = await this.itemRepo.find({
      where: { instrumentId },
      relations: ['procedure', 'procedure.scanDocument'],
    });
    return items.map((item) => item.procedure);
  }

  // Удалить процедуру (только для CANCELLED)
  async remove(id: number) {
    const proc = await this.procRepo.findOneBy({ id });
    if (!proc) throw new Error('Процедура не найдена');
    if (proc.status !== WriteoffStatus.CANCELLED) {
      throw new Error('Удалять можно только отменённые процедуры');
    }
    await this.itemRepo.delete({ procedureId: id });
    await this.procRepo.delete(id);
  }
}
