import { DataSource } from 'typeorm';
import path from 'path';
import { User } from '../entities/User';
import { InstrumentType } from '../entities/InstrumentType';
import { InstrumentSubtype } from '../entities/InstrumentSubtype';
import { OrganizationLocation } from '../entities/OrganizationLocation';
import { Instrument } from '../entities/Instrument';
import { VerificationHistory } from '../entities/VerificationHistory';
import { Repair } from '../entities/Repair';
import { WriteoffProcedure, WriteoffProcedureItem, WriteoffApproval } from '../entities/Writeoff';
import { Document } from '../entities/Document';
import { Notification } from '../entities/Notification';
import { AuditLog } from '../entities/AuditLog';
import { InventoryCounter } from '../entities/InventoryCounter';
import { Setting, WriteoffCounter } from '../entities/Setting';

const dbPath = process.env.DATABASE_PATH || './data/database/potrologa.sqlite';
const isDev = process.env.NODE_ENV === 'development';

// Предупреждение о режиме автосинхронизации (только для разработки)
if (!isDev && !process.env.DATABASE_NO_SYNC_WARNING) {
  console.warn('[WARN] synchronize: true не рекомендуется для продакшена. Используйте миграции.');
}

export const AppDataSource = new DataSource({
  type: 'sqljs',
  location: path.resolve(dbPath),
  autoSave: true,
  // Автосинхронизация только в режиме разработки
  synchronize: true,
  entities: [
    User,
    InstrumentType,
    InstrumentSubtype,
    OrganizationLocation,
    Instrument,
    VerificationHistory,
    Repair,
    WriteoffProcedure,
    WriteoffProcedureItem,
    WriteoffApproval,
    Document,
    Notification,
    AuditLog,
    InventoryCounter,
    Setting,
    WriteoffCounter,
  ],
});
