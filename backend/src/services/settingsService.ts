import { AppDataSource } from '../config/database';
import { Setting, WriteoffCounter } from '../entities/Setting';

// Шаблон номера процедуры списания
// Доступные теги:
//   {YYYY} — год (4 цифры)     {YY} — год (2 цифры)
//   {MM}   — месяц             {DD} — день
//   {WW}   — номер недели      {Q}  — квартал (1-4)
//   {HH}   — часы              {mm} — минуты
//   {D}    — суточный счётчик  {W}  — недельный счётчик
//   {M}    — месячный счётчик  {Qn} — квартальный счётчик
//   {Y}    — годовой счётчик
//   Любой другой текст вставляется как есть
const DEFAULT_TEMPLATE = 'АКТ-{YYYY}-{MM}-{DD}-{D}';

export class SettingsService {
  private settingRepo = AppDataSource.getRepository(Setting);
  private counterRepo = AppDataSource.getRepository(WriteoffCounter);

  async getWriteoffTemplate(): Promise<string> {
    const s = await this.settingRepo.findOneBy({ key: 'writeoffNumberTemplate' });
    return s?.value || DEFAULT_TEMPLATE;
  }

  async setWriteoffTemplate(template: string) {
    let s = await this.settingRepo.findOneBy({ key: 'writeoffNumberTemplate' });
    if (s) {
      s.value = template;
      await this.settingRepo.save(s);
    } else {
      s = this.settingRepo.create({ key: 'writeoffNumberTemplate', value: template });
      await this.settingRepo.save(s);
    }
  }

  // Сгенерировать номер по шаблону
  async generateWriteoffNumber(): Promise<string> {
    const template = await this.getWriteoffTemplate();
    const now = new Date();

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const quarter = Math.floor((month - 1) / 3) + 1;

    // ISO номер недели
    const d = new Date(Date.UTC(year, now.getMonth(), day));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const weekNo = Math.ceil(((d.getTime() - new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime()) / 86400000 + 1) / 7);

    // Ключи периодов для счётчиков
    const periods = {
      D: `${year}-${pad2(month)}-${pad2(day)}`,       // суточный
      W: `${year}-W${pad2(weekNo)}`,                  // недельный
      M: `${year}-${pad2(month)}`,                    // месячный
      Qn: `${year}-Q${quarter}`,                       // квартальный
      Y: `${year}`,                                    // годовой
    };

    // Инкремент счётчиков
    const counters: Record<string, number> = {};
    for (const [tag, periodKey] of Object.entries(periods)) {
      const tagLower = tag === 'Qn' ? 'Q' : tag;
      const counter = await this.getNextCounter(periodKey);
      counters[tagLower] = counter;
    }

    // Замена тегов
    let result = template
      .replace(/\{YYYY\}/g, String(year))
      .replace(/\{YY\}/g, String(year).slice(2))
      .replace(/\{MM\}/g, pad2(month))
      .replace(/\{DD\}/g, pad2(day))
      .replace(/\{WW\}/g, pad2(weekNo))
      .replace(/\{Q\}/g, String(quarter))
      .replace(/\{HH\}/g, pad2(now.getHours()))
      .replace(/\{mm\}/g, pad2(now.getMinutes()))
      .replace(/\{Qn\}/g, String(counters['Q'] ?? 1))
      .replace(/\{D\}/g, String(counters['D'] ?? 1))
      .replace(/\{W\}/g, String(counters['W'] ?? 1))
      .replace(/\{M\}/g, String(counters['M'] ?? 1))
      .replace(/\{Y\}/g, String(counters['Y'] ?? 1));

    return result;
  }

  private async getNextCounter(periodKey: string): Promise<number> {
    let counter = await this.counterRepo.findOneBy({ periodKey });
    if (!counter) {
      counter = this.counterRepo.create({ periodKey, value: 0 });
    }
    counter.value += 1;
    await this.counterRepo.save(counter);
    return counter.value;
  }

  // Список тегов для UI
  getTags(): { tag: string; label: string }[] {
    return [
      { tag: '{YYYY}', label: 'Год (2026)' },
      { tag: '{YY}', label: 'Год (26)' },
      { tag: '{MM}', label: 'Месяц (05)' },
      { tag: '{DD}', label: 'День (26)' },
      { tag: '{WW}', label: 'Неделя (21)' },
      { tag: '{Q}', label: 'Квартал (2)' },
      { tag: '{HH}', label: 'Часы (14)' },
      { tag: '{mm}', label: 'Минуты (30)' },
      { tag: '{D}', label: 'Суточный счётчик' },
      { tag: '{W}', label: 'Недельный счётчик' },
      { tag: '{M}', label: 'Месячный счётчик' },
      { tag: '{Qn}', label: 'Квартальный счётчик' },
      { tag: '{Y}', label: 'Годовой счётчик' },
    ];
  }
}
