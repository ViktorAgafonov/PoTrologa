#!/bin/bash
# Точка входа: создание директорий и запуск приложения
mkdir -p /app/backend/data/database \
         /app/backend/data/documents \
         /app/backend/data/backups \
         /app/backend/data/logs \
         /app/backend/data/tmp

exec node /app/backend/dist/app.js
