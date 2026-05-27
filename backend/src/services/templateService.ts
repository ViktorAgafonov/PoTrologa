import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { config } from '../config/env';

// Сервис шаблонов актов списания
// Шаблонные переменные: {procedureNumber} {date} {reason} {instrumentTable}
// Для .docx используется docxtemplater (синтаксис {tag}, таблицы через {#items}{/items})
export class TemplateService {
  private templatesDir = path.resolve(config.documentsPath, '../templates');

  constructor() {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  // Список шаблонов
  getAll() {
    if (!fs.existsSync(this.templatesDir)) return [];
    return fs.readdirSync(this.templatesDir).map((f) => {
      const stats = fs.statSync(path.join(this.templatesDir, f));
      return { filename: f, size: stats.size, modified: stats.mtime.toISOString() };
    });
  }

  // Загрузить шаблон (декодируем latin1 → utf-8 для кириллицы)
  upload(file: Express.Multer.File): string {
    const filename = Buffer.from(file.originalname, 'latin1').toString('utf-8');
    const destPath = path.join(this.templatesDir, filename);
    fs.renameSync(file.path, destPath);
    return filename;
  }

  // Удалить шаблон
  remove(filename: string) {
    const fp = path.join(this.templatesDir, filename);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
    }
  }

  // Получить содержимое шаблона (для текстовых шаблонов)
  getContent(filename: string): string | null {
    const fp = path.join(this.templatesDir, filename);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp, 'utf-8');
  }

  // Сохранить содержимое шаблона
  saveContent(filename: string, content: string) {
    const fp = path.join(this.templatesDir, filename);
    fs.writeFileSync(fp, content, 'utf-8');
  }

  // Путь к файлу шаблона
  getFilePath(filename: string): string {
    return path.join(this.templatesDir, filename);
  }

  // Применить текстовый шаблон (.txt/.html): подставить {{переменные}}
  renderText(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  // Применить .docx шаблон через docxtemplater
  // Переменные в шаблоне: {procedureNumber}, {date}, {reason}
  // Таблица позиций: {#items}{num}{inventoryNumber}{name}{/items}
  renderDocx(filename: string, vars: Record<string, any>): Buffer {
    const fp = path.join(this.templatesDir, filename);
    if (!fs.existsSync(fp)) throw new Error(`Шаблон не найден: ${filename}`);
    const content = fs.readFileSync(fp, 'binary');
    // Проверяем формат delimiters шаблона (должны быть {{ }})
    if (!content.includes('{{') && content.includes('{')) {
      throw new Error('Шаблон использует одинарные скобки { }, ожидаются двойные {{ }}');
    }
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
      delimiters: { start: '{{', end: '}}' },
    });
    try {
      doc.render(vars);
    } catch (err: any) {
      // Детальная диагностика docxtemplater ошибок
      const errorDetails: string[] = [];
      if (err.properties?.errors) {
        for (const e of err.properties.errors) {
          errorDetails.push(`Tag: "${e.properties?.tag || '?'}", ${e.properties?.explanation || e.message}`);
        }
      }
      const detailMsg = errorDetails.length > 0 ? errorDetails.join('; ') : err.message;
      throw new Error(`Docxtemplater: ${detailMsg}`);
    }
    return doc.getZip().generate({ type: 'nodebuffer' });
  }

  // Универсальный рендер: определяет тип и возвращает Buffer или string
  render(filename: string, vars: Record<string, any>): { buffer: Buffer; contentType: string; ext: string } {
    if (filename.endsWith('.docx')) {
      const buffer = this.renderDocx(filename, vars);
      return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' };
    }
    // Текстовый шаблон
    const template = this.getContent(filename);
    if (!template) throw new Error('Шаблон не найден');
    const text = this.renderText(template, vars);
    return { buffer: Buffer.from(text, 'utf-8'), contentType: 'text/plain; charset=utf-8', ext: filename.split('.').pop() || 'txt' };
  }
}
