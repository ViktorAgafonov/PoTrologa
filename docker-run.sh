#!/bin/sh
# Запуск контейнера ПоТролога
docker run -d \
  --name potrologa \
  -p 3000:3000 \
  -v potrologa-data:/app/backend/data \
  --restart unless-stopped \
  vvagafonov/potrologa:latest
