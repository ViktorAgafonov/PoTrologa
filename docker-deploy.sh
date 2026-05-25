#!/bin/bash
# Деплой: сборка multi-arch образа и push в Docker Hub
IMAGE_NAME=${1:-"potrologa"}
TAG=${2:-"latest"}

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "$IMAGE_NAME:$TAG" \
  --push \
  .
