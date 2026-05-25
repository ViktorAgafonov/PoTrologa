# AI ENGINEERING SPEC

# Project: ПоТролога --- помощник метролога

Version: 1.2 Final

## 1. Purpose

Build a metrology management application by adapting the existing
AssistOnline architecture.

Priorities: 1. Working simplicity 2. Maintainability 3. Predictability
4. Low administration 5. Performance

Do not redesign from scratch.

## 2. Architecture

React SPA ↓ Express REST API ↓ SQLite ↓ File storage

Single Docker container serves: - /api/\* - frontend/dist

Forbidden: - Microservices - Kubernetes - Redis requirement -
PostgreSQL - GraphQL - JWT - CQRS - Event sourcing - WebSockets -
Axios - Message brokers

## 3. Technology stack

Frontend: - React 18 - TypeScript - Vite - Material UI - React Router -
Fetch API

Backend: - NodeJS 20 - Express - TypeScript - TypeORM - sql.js (SQLite via
WebAssembly, no native compilation) - Passport - express-session - node-cron

Deployment: - Docker multi-stage - bash deployment scripts - Docker
Hub - amd64 + arm64

## 4. Persistent storage

/app/backend/data/

database/ potrologa.sqlite

documents/ passports/ manuals/ certificates/ repairs/ writeoff/ other/

backups/ logs/

Rules: - Metadata only in DB - Files stored separately - No BLOBs

## 5. Entities

User InstrumentType InstrumentSubtype OrganizationLocation
ResponsiblePerson Instrument VerificationHistory Repair
WriteoffProcedure WriteoffProcedureItems WriteoffApprovals Document
Notification AuditLog InventoryCounter

## 6. Instrument lifecycle

Created ↓ Active ↓ Repair ↓ Verification ↓ Writeoff

Deletion prohibited. History immutable.

## 7. Inventory numbers

Start: 1000

Algorithm: currentValue++

Rules: - Unique - Never reused - Writeoff does not free number - Never
use SELECT MAX()

## 8. Verification rules

If nextVerificationDate exists: use it

Else: verificationDate + interval

Failed verification: - propose writeoff - require reason - require
document

## 9. XLSX import

Matching: 1. inventoryNumber 2. serialNumber

Cases: - Create if absent - Compare if exists - Show conflicts - User
resolves conflicts

Forbidden: - Delete records - Modify histories - Modify writeoff archive

## 10. Writeoff workflow

Step 1: Select instruments by checkboxes

Step 2: Create WriteoffProcedure

Statuses: - DRAFT - IN_APPROVAL - WAITING_SCAN - COMPLETED - CANCELLED

Step 3: Generate act from template

Template variables: {{procedureNumber}} {{date}} {{instrumentTable}}
{{responsiblePerson}} {{approvals}}

Output: - DOCX - PDF

Step 4: External approval

Step 5: Upload signed scan

Allowed: - pdf - jpg - png

Step 6: Move instruments to WRITEOFF archive

Rules: Instrument becomes WRITEOFF only after signed act uploaded.

## 11. Scheduled jobs

Verification monitor: Daily 01:00

Backup: Daily 02:00

Log cleanup: Weekly

## 12. Backup

Types: - manual - auto - preupdate

Filename: backup_auto_YYYY-MM-DD_HH-mm-ss_records.zip

Retention: 180 days

Contents: - database - documents - metadata - settings

Restore: 1. Safety backup 2. Validate 3. Restore DB 4. Restore files 5.
Restart

## 13. API

/auth /instruments /documents /import /reports /backups /notifications
/writeoff-procedures /templates /monitoring

## 14. UI

Pages: - Login - Dashboard - Instrument List - Instrument Card - Import
Wizard - Backup Management - Template Editor - Settings

Dashboard widgets: - Total - Expired - 14 days - 30 days - Repair -
Writeoff

Instrument tabs: - General - Verification - Repair - Documents - History

## 15. CI/CD

Lint ↓ Tests ↓ Build backend ↓ Build frontend ↓ Build Docker image ↓
Preupdate backup ↓ Run migrations ↓ Deploy

## 16. Acceptance

-   CRUD works
-   Inventory collisions impossible
-   Writeoff immutable
-   History immutable
-   Restore works
-   Backups work
-   ARM64 build works
-   AMD64 build works
-   No critical runtime errors

## 17. Agent execution

Phase 1: entities Phase 2: migrations Phase 3: services Phase 4:
controllers/routes Phase 5: frontend Phase 6: jobs Phase 7: Docker Phase
8: tests Phase 9: build and validate

Stop only if: - business ambiguity - destructive operation - schema
conflict
