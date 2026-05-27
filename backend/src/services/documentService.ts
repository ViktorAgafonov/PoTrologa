import { AppDataSource } from '../config/database';
import { Document, DocumentType } from '../entities/Document';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

// Сервис управления документами (файлы хранятся на диске)
export class DocumentService {
  private repo = AppDataSource.getRepository(Document);

  // Сохранить документ
  async upload(instrumentId: number, type: DocumentType, file: Express.Multer.File, customFilename?: string) {
    // Подкаталог по типу документа
    const safeType = type || DocumentType.OTHER;
    const subdir = safeType.toLowerCase() + 's';
    const destDir = path.resolve(config.documentsPath, subdir);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    // Нормализация кодировки имени файла (latin1 -> utf-8)
    const filename = customFilename || Buffer.from(file.originalname, 'latin1').toString('utf-8');
    const uniqueName = `${Date.now()}_${filename}`;
    const destPath = path.join(destDir, uniqueName);
    fs.renameSync(file.path, destPath);

    const doc = this.repo.create({
      instrumentId,
      type: safeType,
      filename,
      filepath: path.join(subdir, uniqueName),
      uploadDate: new Date().toISOString().split('T')[0],
    });
    return this.repo.save(doc);
  }

  // Получить документ по ID
  async getById(id: number) {
    return this.repo.findOneBy({ id });
  }

  // Полный путь к файлу
  getFilePath(doc: Document): string {
    return path.resolve(config.documentsPath, doc.filepath);
  }

  // Удалить документ
  async remove(id: number) {
    const doc = await this.repo.findOneBy({ id });
    if (doc) {
      const fullPath = this.getFilePath(doc);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      await this.repo.remove(doc);
    }
  }
}
