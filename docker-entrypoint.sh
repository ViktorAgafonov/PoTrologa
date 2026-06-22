#!/bin/sh
# Точка входа: создание директорий и проверка прав
DATA_DIR="/app/backend/data"

for dir in database documents backups logs tmp; do
  mkdir -p "$DATA_DIR/$dir" 2>/dev/null
done

# Проверка прав на запись
if ! touch "$DATA_DIR/.write_test" 2>/dev/null; then
  echo "========================================"
  echo "ОШИБКА: нет прав на запись в $DATA_DIR"
  echo "Запустите контейнер с подходящим UID или"
  echo "исправьте права на примонтированный том:"
  echo "  docker run --user \$(id -u):\$(id -g) ..."
  echo "  или: chown -R 1000:1000 <volume_path>"
  echo "========================================"
  exit 1
fi
rm -f "$DATA_DIR/.write_test"

# Генерация SESSION_SECRET если не задан явно
if [ -z "$SESSION_SECRET" ]; then
  SESSION_SECRET=$(cat /dev/urandom | tr -dc 'A-Za-z0-9' | fold -w 48 | head -n 1)
  export SESSION_SECRET
  echo "[INFO] SESSION_SECRET не задан — сгенерирован автоматически (все сессии сброшены)"
fi

exec node /app/backend/dist/app.js
