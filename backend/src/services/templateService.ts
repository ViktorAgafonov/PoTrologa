import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

// Сервис шаблонов актов списания
// Шаблонные переменные: {{procedureNumber}} {{date}} {{instrumentTable}} {{responsiblePerson}} {{approvals}}
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

  // Загрузить шаблон
  upload(file: Express.Multer.File): string {
    const destPath = path.join(this.templatesDir, file.originalname);
    fs.renameSync(file.path, destPath);
    return file.originalname;
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

  // Применить шаблон: подставить переменные
  render(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }
}
