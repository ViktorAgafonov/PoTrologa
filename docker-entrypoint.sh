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

exec node /app/backend/dist/app.js
