import { AppDataSource } from '../config/database';
import { Instrument, InstrumentStatus } from '../entities/Instrument';

// Сервис формирования отчётов
export class ReportService {
  private repo = AppDataSource.getRepository(Instrument);

  // Общий отчёт
  async general() {
    const total = await this.repo.count();
    const byStatus = await this.repo
      .createQueryBuilder('i')
      .select('i.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('i.status')
      .getRawMany();

    const byType = await this.repo
      .createQueryBuilder('i')
      .select('type.name', 'typeName')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('i.type', 'type')
      .groupBy('type.name')
      .getRawMany();

    const byOrg = await this.repo
      .createQueryBuilder('i')
      .select('org.workshop', 'workshop')
      .addSelect('org.section', 'section')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('i.organization', 'org')
      .groupBy('org.workshop')
      .addGroupBy('org.section')
      .getRawMany();

    return { total, byStatus, byType, byOrg };
  }

  // Отчёт по поверкам (просроченные, через 14 дней, через месяц)
  async verifications() {
    const expired = await this.repo.find({ where: { status: InstrumentStatus.EXPIRED }, relations: ['type', 'organization'] });
    const in14days = await this.repo.find({ where: { status: InstrumentStatus.VERIFICATION_14DAYS }, relations: ['type', 'organization'] });
    const inMonth = await this.repo.find({ where: { status: InstrumentStatus.VERIFICATION_MONTH }, relations: ['type', 'organization'] });
    return { expired, in14days, inMonth };
  }

  // Отчёт по подразделениям
  async byOrganization() {
    return this.repo
      .createQueryBuilder('i')
      .select('org.workshop', 'workshop')
      .addSelect('org.section', 'section')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN i.status = :expired THEN 1 ELSE 0 END)', 'expiredCount')
      .leftJoin('i.organization', 'org')
      .setParameter('expired', InstrumentStatus.EXPIRED)
      .groupBy('org.workshop')
      .addGroupBy('org.section')
      .getRawMany();
  }
}
