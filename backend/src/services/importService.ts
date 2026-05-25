import * as XLSX from 'xlsx';
import { AppDataSource } from '../config/database';
import { Instrument } from '../entities/Instrument';
import { InventoryService } from './inventoryService';
import fs from 'fs';

const inventoryService = new InventoryService();

// Результат анализа импорта
export interface ImportPreview {
  importId: string;
  newRecords: any[];
  updateRecords: any[];
  conflicts: any[];
}

// Сервис импорта XLSX
export class ImportService {
  private repo = AppDataSource.getRepository(Instrument);
  // Хранение временных данных импорта (в памяти)
  private static sessions: Map<string, { rows: any[]; mapping: Record<string, string> }> = new Map();

  // Загрузить и распарсить XLSX-файл
  async upload(filePath: string, mapping: Record<string, string>): Promise<{ importId: string; headers: string[] }> {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const importId = String(Date.now());
    ImportService.sessions.set(importId, { rows, mapping });

    // Получить заголовки колонок
    const headers = rows.length > 0 ? Object.keys(rows[0] as object) : [];

    // Удалить временный файл
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { importId, headers };
  }

  // Обновить маппинг для сессии
  updateMapping(importId: string, mapping: Record<string, string>): boolean {
    const session = ImportService.sessions.get(importId);
    if (!session) return false;
    session.mapping = mapping;
    return true;
  }

  // Предварительный анализ: новые, обновлённые, конфликты
  async preview(importId: string): Promise<ImportPreview | null> {
    const session = ImportService.sessions.get(importId);
    if (!session) return null;

    const { rows, mapping } = session;
    const newRecords: any[] = [];
    const updateRecords: any[] = [];
    const conflicts: any[] = [];

    for (const row of rows) {
      const mapped = this.applyMapping(row, mapping);
      // Поиск по инвентарному номеру, потом по серийному
      let existing: Instrument | null = null;
      if (mapped.inventoryNumber) {
        existing = await this.repo.findOneBy({ inventoryNumber: mapped.inventoryNumber });
      }
      if (!existing && mapped.serialNumber) {
        existing = await this.repo.findOneBy({ serialNumber: mapped.serialNumber });
      }

      if (!existing) {
        newRecords.push(mapped);
      } else {
        const diffs = this.findDiffs(existing, mapped);
        if (diffs.length > 0) {
          conflicts.push({ existing, imported: mapped, diffs });
        } else {
          updateRecords.push(mapped);
        }
      }
    }

    return { importId, newRecords, updateRecords, conflicts };
  }

  // Подтвердить импорт (применить решения по конфликтам)
  async commit(importId: string, resolutions?: Record<string, 'keep' | 'accept' | Record<string, any>>) {
    const session = ImportService.sessions.get(importId);
    if (!session) throw new Error('Сессия импорта не найдена');

    const preview = await this.preview(importId);
    if (!preview) throw new Error('Ошибка предпросмотра');

    let created = 0;
    let updated = 0;

    // Создание новых записей
    for (const rec of preview.newRecords) {
      if (!rec.inventoryNumber) {
        rec.inventoryNumber = await inventoryService.getNextNumber();
      } else {
        await inventoryService.syncWithImported(parseInt(rec.inventoryNumber, 10));
      }
      const instrument = this.repo.create(rec);
      await this.repo.save(instrument);
      created++;
    }

    // Обновление при конфликтах
    for (const conflict of preview.conflicts) {
      const resolution = resolutions?.[conflict.existing.id] || 'keep';
      if (resolution === 'keep') continue;
      if (resolution === 'accept') {
        await this.repo.update(conflict.existing.id, conflict.imported);
        updated++;
      } else if (typeof resolution === 'object') {
        await this.repo.update(conflict.existing.id, resolution);
        updated++;
      }
    }

    ImportService.sessions.delete(importId);
    return { created, updated };
  }

  // Применить маппинг колонок к строке
  private applyMapping(row: any, mapping: Record<string, string>): Partial<Instrument> {
    const result: any = {};
    for (const [excelCol, field] of Object.entries(mapping)) {
      if (row[excelCol] !== undefined) {
        result[field] = row[excelCol];
      }
    }
    return result;
  }

  // Найти расхождения между существующей записью и импортируемыми данными
  private findDiffs(existing: Instrument, imported: Partial<Instrument>): string[] {
    const diffs: string[] = [];
    const keys = Object.keys(imported) as (keyof Instrument)[];
    for (const key of keys) {
      if (imported[key] !== undefined && String(existing[key]) !== String(imported[key])) {
        diffs.push(key);
      }
    }
    return diffs;
  }
}
