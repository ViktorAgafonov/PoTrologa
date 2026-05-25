# ПоТролога — помощник метролога

Веб-приложение для учёта средств измерений, контроля поверок и управления жизненным циклом оборудования метрологической службы предприятия.

## Стек

- **Frontend**: React 19, TypeScript, Vite, Material UI 9, Recharts
- **Backend**: Node.js 20, Express, TypeScript, TypeORM, sql.js (SQLite)
- **Auth**: Passport.js + express-session
- **Deploy**: Docker (single container)

## Возможности

- **Дашборд** — виджеты статистики, графики по типам СИ и подразделениям
- **Список СИ** — сортировка, фильтры (тип, статус), поиск, экспорт XLSX
- **Карточка СИ** — основные данные, поверки, ремонты, документы, история изменений
- **Автоприсвоение инв. номера** при создании
- **Импорт XLSX** — маппинг колонок, предпросмотр, разрешение конфликтов
- **Процедура списания** — полный workflow с генерацией актов из шаблонов
- **Управление шаблонами** актов
- **Проверка в АРШИН** — ссылка на ФГИС
- **Справочники** — типы СИ, участки, ответственные (CRUD + удаление с проверкой связей)
- **Пользователи** — роли ADMIN / METROLOGIST / VIEWER
- **Бэкапы** — создание, скачивание, восстановление
- **Уведомления** о приближающихся поверках
- **Аудит** — журнал всех изменений

## Быстрый старт (разработка)

```bash
# Установить зависимости
npm run install:all

# Backend (порт 3000)
cd backend && npm run dev

# Frontend (порт 5173, proxy → backend)
cd frontend && npm run dev
```

## Запуск (Docker)

```bash
# Docker Compose
docker compose up -d --build

# Или вручную
docker build -t potrologa .
docker run -d -p 3000:3000 -v potrologa-data:/app/backend/data potrologa
```

Приложение: http://localhost:3000

## Переменные окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `PORT` | Порт сервера | `3000` |
| `DATABASE_PATH` | Путь к SQLite БД | `./data/database/potrologa.sqlite` |
| `SESSION_SECRET` | Секрет сессии | `potrologa-secret` |
| `NODE_ENV` | Режим | `development` |

См. `.env.example`

## Учётные данные

- **Логин**: `admin` / **Пароль**: `admin` (создаётся при первом запуске)

## API

Base URL: `/api/v1/`

Основные группы: `/auth`, `/instruments`, `/documents`, `/import`, `/reports`, `/backups`, `/notifications`, `/users`, `/references`, `/writeoff-procedures`, `/templates`, `/monitoring/health`

## Структура проекта

```
backend/src/
  app.ts           — точка входа, Express
  config/          — database, passport
  entities/        — TypeORM сущности
  controllers/     — обработчики запросов
  services/        — бизнес-логика
  routes/          — маршруты API
  middleware/      — auth, logger, errorHandler
  jobs/            — cron задачи
  seeds/           — начальные данные
frontend/src/
  App.tsx           — маршрутизация
  pages/            — страницы (Dashboard, Instruments, Import, Writeoff, Settings...)
  components/       — Layout, навигация
  services/api.ts   — API-клиент
  hooks/            — useAuth
```
