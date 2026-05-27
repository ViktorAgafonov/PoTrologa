import * as XLSX from 'xlsx';
import { AppDataSource } from '../config/database';
import { Instrument, InstrumentStatus } from '../entities/Instrument';
import { InventoryService } from './inventoryService';
import fs from 'fs';

const inventoryService = new InventoryService();

// Автоматическое определение маппинга по заголовкам
const HEADER_MAP: Record<string, string> = {
  'наименование': 'name',
  'наименование си': 'name',
  'название': 'name',
  'тип': 'model',
  'тип, заводское обозначение': 'model',
  'заводское обозначение': 'model',
  'модель': 'model',
  'изготовитель': 'manufacturer',
  'производитель': 'manufacturer',
  'заводской номер': 'serialNumber',
  'серийный номер': 'serialNumber',
  'инвентарный номер': 'inventoryNumber',
  'инв. номер': 'inventoryNumber',
  'инв. №': 'inventoryNumber',
  'год выпуска': 'productionYear',
  'периодичность поверки': 'verificationIntervalMonths',
  'периодичность поверки (месяцы)': 'verificationIntervalMonths',
  'межповерочный интервал': 'verificationIntervalMonths',
  'дата последней поверки': 'lastVerificationDate',
  'дата поверки': 'lastVerificationDate',
  'участок': 'organization',
  'цех': 'organization',
  'место установки': 'organization',
};

// Результат анализа импорта
export interface ImportPreview {
  importId: string;
  newRecords: any[];
  updateRecords: any[];
  conflicts: any[];
}

interface ImportSession {
  rawRows: any[][];
  headerRow: number;
  mapping: Record<string, string>;
}

// Сервис импорта XLSX
export class ImportService {
  private repo = AppDataSource.getRepository(Instrument);
  private static sessions: Map<string, ImportSession> = new Map();

  private autoDetectMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const header of headers) {
      if (!header || typeof header !== 'string') continue;
      const normalized = header.toLowerCase().trim();
      if (HEADER_MAP[normalized]) {
        mapping[header] = HEADER_MAP[normalized];
      }
    }
    return mapping;
  }

  // Читаем XLSX как массив строк (header:1), возвращаем raw + превью
  async upload(filePath: string, mapping: Record<string, string>, headerRow = 0): Promise<{
    importId: string; rawRows: any[][]; headerRow: number; headers: string[]; mapping: Record<string, string>
  }> {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // Читаем как массив массивов: каждая строка = массив ячеек
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

    // Определяем заголовки из выбранной строки
    const headers = (rawRows[headerRow] || []).map((h: any) => String(h ?? '').trim()).filter((h) => h !== '' && !h.startsWith('__EMPTY'));

    if (!mapping || Object.keys(mapping).length === 0) {
      mapping = this.autoDetectMapping(headers);
    }

    const importId = String(Date.now());
    ImportService.sessions.set(importId, { rawRows, headerRow, mapping });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { importId, rawRows: rawRows.slice(0, 15), headerRow, headers, mapping };
  }

  // Обновить headerRow и маппинг
  updateMapping(importId: string, headerRow: number, mapping: Record<string, string>): boolean {
    const session = ImportService.sessions.get(importId);
    if (!session) return false;
    session.headerRow = headerRow;
    session.mapping = mapping;
    return true;
  }

  // Получить данные строк ниже заголовков как объекты
  private getDataRows(session: ImportSession): any[] {
    const { rawRows, headerRow } = session;
    const headers = rawRows[headerRow] || [];
    const dataRows: any[] = [];
    for (let i = headerRow + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) continue;
      const obj: any = {};
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        if (h && !String(h).startsWith('__EMPTY')) {
          obj[h] = row[j];
        }
      }
      dataRows.push(obj);
    }
    return dataRows;
  }

  // Предварительный анализ
  async preview(importId: string): Promise<ImportPreview | null> {
    const session = ImportService.sessions.get(importId);
    if (!session) return null;

    const rows = this.getDataRows(session);
    const { mapping } = session;
    const newRecords: any[] = [];
    const updateRecords: any[] = [];
    const conflicts: any[] = [];

    for (const row of rows) {
      const mapped = this.applyMapping(row, mapping);
      if (!mapped.name) continue; // name обязательно

      let existing: Instrument | null = null;
      if (mapped.inventoryNumber) {
        existing = await this.repo.findOneBy({ inventoryNumber: String(mapped.inventoryNumber) });
      }
      if (!existing && mapped.serialNumber) {
        existing = await this.repo.findOneBy({ serialNumber: String(mapped.serialNumber) });
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

  // Подтвердить импорт
  async commit(importId: string, resolutions?: Record<string, 'keep' | 'accept' | Record<string, any>>) {
    const session = ImportService.sessions.get(importId);
    if (!session) throw new Error('Сессия импорта не найдена');

    const preview = await this.preview(importId);
    if (!preview) throw new Error('Ошибка предпросмотра');

    let created = 0;
    let updated = 0;

    for (const rec of preview.newRecords) {
      if (!rec.name) continue; // пропустить без названия
      this.normalizeRecord(rec);
      if (!rec.inventoryNumber) {
        rec.inventoryNumber = await inventoryService.getNextNumber();
      } else {
        await inventoryService.syncWithImported(parseInt(String(rec.inventoryNumber), 10));
      }
      if (rec.nextVerificationDate) {
        const now = new Date();
        const next = new Date(rec.nextVerificationDate);
        const in14 = new Date(now.getTime() + 14 * 86400000);
        const in30 = new Date(now.getTime() + 30 * 86400000);
        if (next < now) rec.status = InstrumentStatus.EXPIRED;
        else if (next <= in14) rec.status = InstrumentStatus.VERIFICATION_14DAYS;
        else if (next <= in30) rec.status = InstrumentStatus.VERIFICATION_MONTH;
        else rec.status = InstrumentStatus.ACTIVE;
      }
      let retries = 0;
      while (retries < 3) {
        try {
          const instrument = this.repo.create(rec);
          await this.repo.save(instrument);
          created++;
          break;
        } catch (err: any) {
          if (err.message?.includes('UNIQUE constraint failed') && err.message?.includes('inventory_number') && retries < 2) {
            rec.inventoryNumber = await inventoryService.getNextNumber();
            retries++;
          } else {
            throw err;
          }
        }
      }
    }

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

  private applyMapping(row: any, mapping: Record<string, string>): Partial<Instrument> {
    const result: any = {};
    for (const [excelCol, field] of Object.entries(mapping)) {
      if (row[excelCol] !== undefined && row[excelCol] !== null && String(row[excelCol]).trim() !== '') {
        result[field] = row[excelCol];
      }
    }
    return result;
  }

  private normalizeRecord(rec: any) {
    for (const f of ['inventoryNumber', 'serialNumber', 'name', 'model', 'manufacturer', 'productionYear']) {
      if (rec[f] !== undefined) rec[f] = String(rec[f]).trim();
    }
    if (rec.verificationIntervalMonths !== undefined) {
      rec.verificationIntervalMonths = parseInt(String(rec.verificationIntervalMonths), 10) || 12;
    }
    if (rec.lastVerificationDate !== undefined) {
      rec.lastVerificationDate = this.parseDate(rec.lastVerificationDate);
    }
    if (rec.lastVerificationDate && !rec.nextVerificationDate) {
      const months = rec.verificationIntervalMonths || 12;
      const d = new Date(rec.lastVerificationDate);
      if (!isNaN(d.getTime())) {
        d.setMonth(d.getMonth() + months);
        rec.nextVerificationDate = d.toISOString().split('T')[0];
      }
    }
  }

  private parseDate(value: any): string {
    if (!value) return '';
    // JS Date объект от xlsx
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    // Excel serial number (число или строка вида 45441)
    const num = typeof value === 'number' ? value : (typeof value === 'string' && /^\d{5,6}$/.test(value.trim()) ? parseInt(value.trim(), 10) : NaN);
    if (!isNaN(num)) {
      const date = new Date((num - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    const s = String(value).trim();
    // DD.MM.YYYY
    const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // ISO: 2023-08-15T00:00:00.000Z
    const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoMatch) return isoMatch[1];
    // Месяц и год: "Июнь 2010" → 2010-06-01
    const monthNames: Record<string, string> = {
      'январь': '01', 'февраль': '02', 'март': '03', 'апрель': '04',
      'май': '05', 'июнь': '06', 'июль': '07', 'август': '08',
      'сентябрь': '09', 'октябрь': '10', 'ноябрь': '11', 'декабрь': '12',
    };
    const monthMatch = s.toLowerCase().match(/^(\S+)\s+(\d{4})$/);
    if (monthMatch && monthNames[monthMatch[1]]) {
      return `${monthMatch[2]}-${monthNames[monthMatch[1]]}-01`;
    }
    return s;
  }

  private findDiffs(existing: Instrument, imported: Partial<Instrument>): string[] {
    const diffs: string[] = [];
    const keys = Object.keys(imported) as (keyof Instrument)[];
    for (const key of keys) {
      if (imported[key] !== undefined && String(existing[key] || '') !== String(imported[key])) {
        diffs.push(key);
      }
    }
    return diffs;
  }
}
