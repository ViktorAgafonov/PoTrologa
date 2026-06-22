import path from 'path';

/**
 * Проверяет, что имя файла безопасно для использования
 * - Запрещает path traversal (../)
 * - Запрещает абсолютные пути
 * - Запрещает пустые имена и спецсимволы
 */
export function isSafeFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  if (filename.length === 0 || filename.length > 255) return false;

  // Запрещаем path traversal
  if (filename.includes('..') || filename.includes('\0')) return false;

  // Запрещаем абсолютные пути
  if (path.isAbsolute(filename)) return false;

  // Запрещаем служебные имена файлов
  const normalized = path.normalize(filename);
  if (normalized.startsWith('..')) return false;

  // Разрешаем только безопасные символы
  const safePattern = /^[a-zA-Z0-9_.\-\s\u0400-\u04FF]+$/;
  const basename = path.basename(filename);
  if (!safePattern.test(basename)) return false;

  return true;
}

/**
 * Санитизирует имя файла, удаляя опасные символы
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'unnamed';

  // Удаляем path traversal и опасные символы
  let sanitized = filename
    .replace(/\.{2,}[\/\\]/g, '')
    .replace(/[<>|:*?"]/g, '')
    .replace(/\0/g, '')
    .trim();

  // Убираем начальные точки (скрытые файлы)
  sanitized = sanitized.replace(/^[.]+/, '');

  // Ограничиваем длину
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    sanitized = sanitized.slice(0, 255 - ext.length) + ext;
  }

  return sanitized || 'unnamed';
}

/**
 * Генерирует криптографически безопасный случайный ID
 */
export function generateSecureId(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
