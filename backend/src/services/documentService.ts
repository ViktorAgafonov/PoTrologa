import { AppDataSource } from '../config/database';
import { Document, DocumentType } from '../entities/Document';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

// Сервис управления документами (файлы хранятся на диске)
export class DocumentService {
  private repo = AppDataSource.getRepository(Document);

  // Сохранить документ
  async upload(instrumentId: number, type: DocumentType, file: Express.Multer.File) {
    // Подкаталог по типу документа
    const subdir = type.toLowerCase() + 's';
    const destDir = path.resolve(config.documentsPath, subdir);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const uniqueName = `${Date.now()}_${file.originalname}`;
    const destPath = path.join(destDir, uniqueName);
    fs.renameSync(file.path, destPath);

    const doc = this.repo.create({
      instrumentId,
      type,
      filename: file.originalname,
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
