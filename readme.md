# ПоТролога — помощник метролога

> v1.1.0 · © 2026 Агафонов В.В. · [GitHub](https://github.com/ViktorAgafonov/PoTrologa) · MIT License

Веб-приложение для учёта средств измерений, контроля поверок и управления жизненным циклом оборудования метрологической службы предприятия.

## Стек

- **Frontend**: React 19, TypeScript, Vite, Material UI 9
- **Backend**: Node.js 20, Express, TypeScript, TypeORM, sql.js (SQLite)
- **Auth**: Passport.js + express-session
- **Deploy**: Docker (single container)

## Возможности

- **Список СИ** (главная) — сортировка по инв. номеру, статусу, датам поверки; фильтры (тип, статус); поиск; экспорт XLSX
- **Карточка СИ** — основные данные, поверки (пред./след. дата), ремонты, документы, история изменений
- **Автоприсвоение инв. номера** при создании
- **Импорт XLSX** — вкладка в настройках: загрузка → маппинг колонок → предпросмотр → коммит
- **Процедура списания** — workflow: черновик → печать акта → загрузка скана → завершение
- **Шаблоны актов** — загрузка, редактирование, переменные `{{procedureNumber}}` `{{date}}` `{{reason}}` `{{instrumentTable}}`
- **Справочники** — типы СИ, участки (цех → участок)
- **Пользователи** — роли ADMIN / METROLOGIST / VIEWER
- **Бэкапы** — создание, скачивание, восстановление
- **Уведомления** о приближающихся поверках
- **Аудит** — журнал всех изменений (русские метки действий)
- **Отчёты** — по статусам, подразделениям, типам

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

Группы: `/auth`, `/instruments`, `/documents`, `/import`, `/reports`, `/backups`, `/notifications`, `/users`, `/references`, `/writeoff-procedures`, `/templates`, `/monitoring/health`

## Структура проекта

```
backend/src/
  app.ts           — точка входа, Express
  config/          — database, passport, env
  entities/        — TypeORM сущности (Instrument, Writeoff, Document, AuditLog, User и др.)
  controllers/     — обработчики запросов
  services/        — бизнес-логика
  routes/          — маршруты API
  middleware/      — auth, logger, errorHandler
  jobs/            — cron задачи (статусы поверок)
  seeds/           — начальные данные
frontend/src/
  App.tsx           — маршрутизация
  pages/            — InstrumentList, InstrumentCard, Writeoff, Templates, Backup, Settings
  components/       — Layout (permanent sidebar + tooltips)
  services/api.ts   — API-клиент
  hooks/            — useAuth
```

## Автор

**Агафонов Виктор Викторович**, 2026 г.

GitHub: [github.com/ViktorAgafonov/PoTrologa](https://github.com/ViktorAgafonov/PoTrologa)

## Генерация кода

Исходный код этого проекта сгенерирован с помощью **Cascade** — AI-ассистента для программирования, разработанного компанией [Codeium](https://codeium.com) (продукт [Windsurf IDE](https://windsurf.com)).

Большая благодарность команде Codeium за создание такого мощного инструмента нейросетевой генерации кода, который позволяет воплощать идеи в рабочие приложения с минимальными усилиями.

## Лицензия

[MIT](LICENSE)

Все используемые библиотеки распространяются под совместимыми свободными лицензиями (MIT, Apache-2.0).
