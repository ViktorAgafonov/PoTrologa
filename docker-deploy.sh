#!/bin/sh
# Мультиплатформенная сборка (amd64 + arm64) и push в Docker Hub
IMAGE="vvagafonov/potrologa"
TAG="${1:-latest}"

# Создаём buildx builder если не существует
docker buildx inspect potrologa-builder >/dev/null 2>&1 \
  || docker buildx create --name potrologa-builder --use

docker buildx build \
  --builder potrologa-builder \
  --platform linux/amd64,linux/arm64 \
  -t "$IMAGE:$TAG" \
  -t "$IMAGE:latest" \
  --push \
  .
