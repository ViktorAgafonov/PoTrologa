import { DataSource } from 'typeorm';
import path from 'path';
import { User } from '../entities/User';
import { InstrumentType } from '../entities/InstrumentType';
import { InstrumentSubtype } from '../entities/InstrumentSubtype';
import { OrganizationLocation } from '../entities/OrganizationLocation';
import { ResponsiblePerson } from '../entities/ResponsiblePerson';
import { Instrument } from '../entities/Instrument';
import { VerificationHistory } from '../entities/VerificationHistory';
import { Repair } from '../entities/Repair';
import { WriteoffProcedure, WriteoffProcedureItem, WriteoffApproval } from '../entities/Writeoff';
import { Document } from '../entities/Document';
import { Notification } from '../entities/Notification';
import { AuditLog } from '../entities/AuditLog';
import { InventoryCounter } from '../entities/InventoryCounter';

const dbPath = process.env.DATABASE_PATH || './data/database/potrologa.sqlite';

export const AppDataSource = new DataSource({
  type: 'sqljs',
  location: path.resolve(dbPath),
  autoSave: true,
  // В разработке synchronize:true, в продакшене — миграции
  synchronize: process.env.NODE_ENV !== 'production',
  entities: [
    User,
    InstrumentType,
    InstrumentSubtype,
    OrganizationLocation,
    ResponsiblePerson,
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
  ],
});
