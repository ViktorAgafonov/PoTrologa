import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { Instrument, InstrumentStatus } from '../entities/Instrument';
import { VerificationHistory } from '../entities/VerificationHistory';
import { Not, In } from 'typeorm';

// Ежедневная проверка сроков поверки (01:00)
// Обновляет статусы СИ: просрочено, через 14 дней, через месяц
export function startVerificationMonitor(): void {
  cron.schedule('0 1 * * *', async () => {
    try {
      await updateVerificationStatuses();
      console.log('[CRON] Мониторинг поверок выполнен');
    } catch (err) {
      console.error('[CRON] Ошибка мониторинга поверок:', err);
    }
  });
}

// Логика обновления статусов поверки
export async function updateVerificationStatuses(): Promise<void> {
  const repo = AppDataSource.getRepository(Instrument);
  const verRepo = AppDataSource.getRepository(VerificationHistory);
  const now = new Date();
  const in14days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Только активные СИ (не списанные и не в ремонте)
  const instruments = await repo.find({
    where: { status: Not(In([InstrumentStatus.WRITEOFF, InstrumentStatus.REPAIR])) },
  });

  for (const inst of instruments) {
    // Получить последнюю поверку
    const lastVer = await verRepo.findOne({
      where: { instrumentId: inst.id },
      order: { verificationDate: 'DESC' },
    });

    let nextDate: Date | null = null;

    if (inst.nextVerificationDate) {
      nextDate = new Date(inst.nextVerificationDate);
    } else if (lastVer?.nextVerificationDate) {
      nextDate = new Date(lastVer.nextVerificationDate);
    } else if (lastVer?.verificationDate && inst.verificationIntervalMonths) {
      const d = new Date(lastVer.verificationDate);
      d.setMonth(d.getMonth() + inst.verificationIntervalMonths);
      nextDate = d;
    }

    if (!nextDate) {
      // Нет данных о поверке — оставляем ACTIVE
      if (inst.status !== InstrumentStatus.ACTIVE) {
        await repo.update(inst.id, { status: InstrumentStatus.ACTIVE });
      }
      continue;
    }

    let newStatus: InstrumentStatus;
    if (nextDate < now) {
      newStatus = InstrumentStatus.EXPIRED;
    } else if (nextDate <= in14days) {
      newStatus = InstrumentStatus.VERIFICATION_14DAYS;
    } else if (nextDate <= in30days) {
      newStatus = InstrumentStatus.VERIFICATION_MONTH;
    } else {
      newStatus = InstrumentStatus.ACTIVE;
    }

    if (inst.status !== newStatus) {
      await repo.update(inst.id, { status: newStatus });
    }
  }
}
