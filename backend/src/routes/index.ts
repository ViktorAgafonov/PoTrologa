import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthController } from '../controllers/authController';
import { InstrumentController } from '../controllers/instrumentController';
import { DocumentController } from '../controllers/documentController';
import { ImportController } from '../controllers/importController';
import { ReportController } from '../controllers/reportController';
import { BackupController } from '../controllers/backupController';
import { NotificationController } from '../controllers/notificationController';
import { UserController } from '../controllers/userController';
import { ReferenceController } from '../controllers/referenceController';
import { WriteoffController } from '../controllers/writeoffController';
import { TemplateController } from '../controllers/templateController';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { UserRole } from '../entities/User';
import { AuditService } from '../services/auditService';

const router = Router();

// Загрузка файлов во временную папку
const upload = multer({ dest: path.resolve('./data/tmp') });

// Контроллеры
const auth = new AuthController();
const instruments = new InstrumentController();
const documents = new DocumentController();
const imports = new ImportController();
const reports = new ReportController();
const backups = new BackupController();
const notifications = new NotificationController();
const users = new UserController();
const refs = new ReferenceController();
const writeoffs = new WriteoffController();
const templates = new TemplateController();

// --- Авторизация ---
router.post('/auth/login', (req, res, next) => auth.login(req, res, next));
router.post('/auth/logout', (req, res) => auth.logout(req, res));
router.get('/auth/me', (req, res) => auth.me(req, res));

// --- Дашборд ---
router.get('/instruments/dashboard', isAuthenticated, (req, res, next) => instruments.dashboard(req, res, next));

// --- Средства измерения ---
router.get('/instruments', isAuthenticated, (req, res, next) => instruments.getAll(req, res, next));
// Экспорт XLSX (до :id чтобы не перехватывался)
router.get('/instruments/export', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), async (req, res, next) => {
  try {
    const XLSX = await import('xlsx');
    const { AppDataSource } = await import('../config/database');
    const { Instrument } = await import('../entities/Instrument');
    const repo = AppDataSource.getRepository(Instrument);
    const items = await repo.find({ relations: ['type', 'organization', 'responsible'] });
    const rows = items.map((i) => ({
      'Инв. №': i.inventoryNumber,
      'Название': i.name,
      'Модель': i.model,
      'Серийный №': i.serialNumber,
      'Производитель': i.manufacturer,
      'Тип': i.type?.name || '',
      'Участок': i.organization ? [i.organization.factory, i.organization.workshop, i.organization.section].filter(Boolean).join(' → ') : '',
      'Ответственный': i.responsible?.fullName || i.responsible?.position || '',
      'Статус': i.status,
      'Интервал поверки (мес)': i.verificationIntervalMonths,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'СИ');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="instruments.xlsx"');
    res.send(Buffer.from(buf));
  } catch (err) { next(err); }
});
router.get('/instruments/:id', isAuthenticated, (req, res, next) => instruments.getById(req, res, next));
router.post('/instruments', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => instruments.create(req, res, next));
router.put('/instruments/:id', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => instruments.update(req, res, next));
router.post('/instruments/:id/verification', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => instruments.addVerification(req, res, next));
router.get('/instruments/:id/verification', isAuthenticated, (req, res, next) => instruments.getVerifications(req, res, next));
router.post('/instruments/:id/repair', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => instruments.addRepair(req, res, next));
router.get('/instruments/:id/repairs', isAuthenticated, (req, res, next) => instruments.getRepairs(req, res, next));

// --- Документы ---
router.post('/documents', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), upload.single('file'), (req, res, next) => documents.upload(req, res, next));
router.get('/documents/:id', isAuthenticated, (req, res, next) => documents.download(req, res, next));
router.delete('/documents/:id', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => documents.remove(req, res, next));

// --- AuditLog по сущности ---
const auditSvc = new AuditService();
router.get('/audit/:entity/:entityId', isAuthenticated, async (req, res, next) => {
  try {
    const items = await auditSvc.getByEntity(req.params.entity as string, Number(req.params.entityId));
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// --- Импорт ---
router.post('/import/upload', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), upload.single('file'), (req, res, next) => imports.upload(req, res, next));
router.post('/import/:id/mapping', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => imports.updateMapping(req, res, next));
router.get('/import/:id/preview', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => imports.preview(req, res, next));
router.post('/import/:id/commit', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => imports.commit(req, res, next));

// --- Отчёты ---
router.get('/reports/general', isAuthenticated, (req, res, next) => reports.general(req, res, next));
router.get('/reports/verifications', isAuthenticated, (req, res, next) => reports.verifications(req, res, next));
router.get('/reports/organization', isAuthenticated, (req, res, next) => reports.departments(req, res, next));

// --- Бэкапы ---
router.post('/backups/create', hasRole(UserRole.ADMIN), (req, res, next) => backups.create(req, res, next));
router.get('/backups', hasRole(UserRole.ADMIN), (req, res, next) => backups.getAll(req, res, next));
router.get('/backups/:id', hasRole(UserRole.ADMIN), (req, res, next) => backups.download(req, res, next));
router.post('/backups/restore', hasRole(UserRole.ADMIN), (req, res, next) => backups.restore(req, res, next));

// --- Уведомления ---
router.get('/notifications', isAuthenticated, (req, res, next) => notifications.getAll(req, res, next));
router.post('/notifications/:id/read', isAuthenticated, (req, res, next) => notifications.markRead(req, res, next));

// --- Пользователи ---
router.get('/users', hasRole(UserRole.ADMIN), (req, res, next) => users.getAll(req, res, next));
router.post('/users', hasRole(UserRole.ADMIN), (req, res, next) => users.create(req, res, next));
router.put('/users/:id', hasRole(UserRole.ADMIN), (req, res, next) => users.update(req, res, next));
router.delete('/users/:id', hasRole(UserRole.ADMIN), (req, res, next) => users.remove(req, res, next));

// --- Справочники ---
router.get('/references/types', isAuthenticated, (req, res, next) => refs.getTypes(req, res, next));
router.post('/references/types', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => refs.createType(req, res, next));
router.post('/references/subtypes', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => refs.createSubtype(req, res, next));
router.get('/references/organizations', isAuthenticated, (req, res, next) => refs.getOrganizations(req, res, next));
router.post('/references/organizations', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => refs.createOrganization(req, res, next));
router.get('/references/responsibles', isAuthenticated, (req, res, next) => refs.getResponsibles(req, res, next));
router.post('/references/responsibles', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => refs.createResponsible(req, res, next));
router.delete('/references/types/:id', hasRole(UserRole.ADMIN), (req, res, next) => refs.deleteType(req, res, next));
router.delete('/references/organizations/:id', hasRole(UserRole.ADMIN), (req, res, next) => refs.deleteOrganization(req, res, next));
router.delete('/references/responsibles/:id', hasRole(UserRole.ADMIN), (req, res, next) => refs.deleteResponsible(req, res, next));

// --- Процедуры списания ---
router.post('/writeoff-procedures', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => writeoffs.create(req, res, next));
router.get('/writeoff-procedures', isAuthenticated, (req, res, next) => writeoffs.getAll(req, res, next));
router.get('/writeoff-procedures/:id', isAuthenticated, (req, res, next) => writeoffs.getById(req, res, next));
router.post('/writeoff-procedures/:id/send-to-approval', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => writeoffs.sendToApproval(req, res, next));
router.post('/writeoff-procedures/:id/approvals', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => writeoffs.addApproval(req, res, next));
router.post('/writeoff-procedures/approvals/:id/approve', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => writeoffs.approve(req, res, next));
router.post('/writeoff-procedures/:id/upload-scan', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => writeoffs.uploadScan(req, res, next));
router.post('/writeoff-procedures/:id/generate-act', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => writeoffs.generateAct(req, res, next));
router.post('/writeoff-procedures/:id/cancel', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => writeoffs.cancel(req, res, next));

// --- Шаблоны ---
router.get('/templates', isAuthenticated, (req, res, next) => templates.getAll(req, res, next));
router.post('/templates', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), upload.single('file'), (req, res, next) => templates.upload(req, res, next));
router.get('/templates/:filename', isAuthenticated, (req, res, next) => templates.download(req, res, next));
router.put('/templates/:filename', hasRole(UserRole.ADMIN, UserRole.METROLOGIST), (req, res, next) => templates.update(req, res, next));
router.delete('/templates/:filename', hasRole(UserRole.ADMIN), (req, res, next) => templates.remove(req, res, next));

// --- Health check ---
router.get('/monitoring/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
