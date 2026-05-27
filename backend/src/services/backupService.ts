import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { Instrument } from '../entities/Instrument';

// Сервис резервного копирования
export class BackupService {
  private backupDir = path.resolve(config.backupPath);

  constructor() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Создать резервную копию (БД + документы + метаданные)
  async create(type: 'manual' | 'auto' | 'preupdate'): Promise<string> {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const repo = AppDataSource.getRepository(Instrument);
    const count = await repo.count();
    const filename = `backup_${type}_${ts}_records-${count}.zip`;
    const filepath = path.join(this.backupDir, filename);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(filename));
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      // БД
      const dbPath = path.resolve(config.databasePath);
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'database/potrologa.sqlite' });
      }

      // Документы
      const docsDir = path.resolve(config.documentsPath);
      if (fs.existsSync(docsDir)) {
        archive.directory(docsDir, 'documents');
      }

      // Метаданные
      const metadata = JSON.stringify({
        application: 'Помощник Метролога',
        version: '1.0',
        backupType: type,
        recordsCount: count,
        created: now.toISOString(),
      });
      archive.append(metadata, { name: 'metadata.json' });

      archive.finalize();
    });
  }

  // Список бэкапов
  getAll() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs
      .readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.zip'))
      .map((f) => {
        const stats = fs.statSync(path.join(this.backupDir, f));
        return { filename: f, size: stats.size, created: stats.mtime.toISOString() };
      })
      .sort((a, b) => b.created.localeCompare(a.created));
  }

  // Путь к файлу бэкапа
  getFilePath(filename: string): string {
    return path.join(this.backupDir, filename);
  }

  // Удалить бэкапы старше N дней
  cleanOld(days: number) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(this.backupDir).filter((f) => f.endsWith('.zip'));
    for (const f of files) {
      const stats = fs.statSync(path.join(this.backupDir, f));
      if (stats.mtime.getTime() < cutoff) {
        fs.unlinkSync(path.join(this.backupDir, f));
      }
    }
  }
}
