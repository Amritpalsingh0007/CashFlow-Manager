# Brook — Project Context Document

> This document is the single source of truth for Brook. Any AI assistant or developer reading this should be able to understand the full system, make coding decisions consistent with existing design choices, write documentation, and implement features without ambiguity.

> **Stack note:** Brook is built as a single full-stack **Next.js (App Router, TypeScript)** application deployed on **Vercel**. Business requirements, domain model, entities, roles, and API contract are unchanged from the earlier Spring Boot version. Only the technology used to implement them has changed.

---

## 1. Problem Statement

A small truck transport business in India mixes personal and business finances into one shared bank account. There is no documentation of:
- How much revenue each trip generates
- What the true cost of running the business is
- Whether the business is actually profitable month to month
- What household expenses look like separately from business expenses

Brook separates these three buckets cleanly and gives the admin a clear picture of business profitability and personal spending.

---

## 2. Users & Roles

There are exactly three users in one organisation. The system is not multi-tenant for other organisations — it is a personal tool for one family's business.

| Role | Person | Access |
|------|--------|--------|
| ADMIN | Raj (son) | Full access — all entities, all views, all reports |
| BUSINESS | Father | Add trip expenses only via simplified mobile UI |
| PERSONAL | Mom | Add household expenses only via simplified mobile UI |

### Role rules
- ADMIN is the only role that creates and manages trips, payments, truck, and users
- BUSINESS and PERSONAL users see only a simplified expense entry screen and their own expense history
- ADMIN sees all expenses across all categories
- Non-admin users are created by ADMIN — there is no self-registration
- Admin account is seeded into the database on first deploy — no setup endpoint needed

---

## 3. Domain Model

### Core concept — the Trip lifecycle

A Trip is the most important entity. It represents one delivery job from order received to payment cleared.

```
Trip status flow:
ORDER_RECEIVED → IN_TRANSIT → DELIVERED → DOCS_SENT → PAYMENT_PENDING → COMPLETED
```

When a trip moves to DELIVERED status, the system automatically creates an IN_BETWEEN trip record so the father can continue logging expenses (fuel to reach next pickup) without admin intervention.

### Financial model for one trip

```
Agreed fare       = rate_per_ton × agreed_weight        (known approximately upfront)
Actual fare       = rate_per_ton × actual_weight         (confirmed at delivery)
Shortage penalty  = deducted by client for weight loss   (one value per trip)
Brokerage         = actual_fare × brokerage_pct          (deducted by broker, typically 5–6%)
Advance           = partial payment mid-trip (no brokerage cut on advance)
Final payment     = actual_fare - shortage_penalty - brokerage - advance

Trip Revenue      = Advance + Final payment
Trip direct costs = Fuel + Toll + Cleaning + Other trip expenses
Gross trip profit = Trip Revenue - Trip direct costs
```

### Business level P&L

```
Monthly gross profit  = SUM(gross trip profit) for all trips in month
Truck overhead        = Maintenance + Tyres + Breakdown + Tax + Fastag (NOT per trip)
Net business profit   = Monthly gross profit - Truck overhead
Personal expenses     = Household + Grocery + Medical + Other personal
Remaining cash        = Net business profit - Personal expenses
```

### Why truck overhead is separate
Truck maintenance, tyre replacement, breakdowns, and yearly taxes are costs of owning and operating the truck — not attributable to any single trip. A breakdown mid-trip does not affect that trip's profitability (no penalty for delivery delay in this business). These are tracked separately to give a true net business profit figure.

---

## 4. Entities & Relationships

```
Organisation  1 ──< User           (one org, many users)
Organisation  1 ──< Truck          (one org, one truck currently — model supports many)
Organisation  1 ──< Trip           (one org, many trips)
Organisation  1 ──< Expense        (one org, many expenses)
User          1 ──  UserRole       (one user, one role)
Truck         1 ──< Trip           (one truck, many trips)
Trip          1 ──< Payment        (one trip, many payments — advance + final)
Trip          1 ──< Expense        (one trip, many trip expenses — trip_id nullable)
User          1 ──< Expense        (created_by, updated_by audit fields)
```

### Entity field reference

Table and column names below are the database (snake_case) names. In Prisma, models use PascalCase/camelCase and are mapped to these names with `@@map` / `@map`.

**auth_user**
```
id            UUID PK
email         VARCHAR UNIQUE NOT NULL
password      VARCHAR NOT NULL          ← bcrypt hashed
role_id       UUID FK → user_role
created_at    TIMESTAMP
```

**user_role**
```
id            UUID PK
role          VARCHAR                   ← ADMIN | BUSINESS | PERSONAL
```

**user** (profile, separate from auth)
```
id            UUID PK
org_id        UUID FK → organisation
auth_user_id  UUID FK → auth_user
name          VARCHAR NOT NULL
phone         VARCHAR
created_at    TIMESTAMP
```

**organisation**
```
id            UUID PK
name          VARCHAR NOT NULL
created_at    TIMESTAMP
```

**refresh_token**
```
id            UUID PK
auth_user_id  UUID FK → auth_user
token         VARCHAR UNIQUE NOT NULL
expiry        TIMESTAMP
created_at    TIMESTAMP
```

**truck**
```
id            UUID PK
org_id        UUID FK → organisation
reg_number    VARCHAR NOT NULL
model         VARCHAR
created_at    TIMESTAMP
```

**trip**
```
id                UUID PK
org_id            UUID FK → organisation
truck_id          UUID FK → truck
broker_name       VARCHAR NOT NULL
rate_per_ton      DECIMAL NOT NULL
agreed_weight     DECIMAL NOT NULL
actual_weight     DECIMAL                ← updated after delivery
shortage_penalty  DECIMAL DEFAULT 0
brokerage_pct     DECIMAL DEFAULT 5.5
status            VARCHAR NOT NULL       ← ORDER_RECEIVED|IN_TRANSIT|DELIVERED|DOCS_SENT|PAYMENT_PENDING|COMPLETED
start_date        DATE NOT NULL
end_date          DATE
payment_received  BOOLEAN DEFAULT false
created_by        UUID FK → user
updated_by        UUID FK → user
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**payment**
```
id              UUID PK
trip_id         UUID FK → trip NOT NULL
amount          DECIMAL NOT NULL
type            VARCHAR NOT NULL         ← ADVANCE | FINAL
received_date   DATE NOT NULL
created_by      UUID FK → user
created_at      TIMESTAMP
```

**expense**
```
id              UUID PK
org_id          UUID FK → organisation NOT NULL
trip_id         UUID FK → trip           ← nullable (truck overhead + personal have no trip)
amount          DECIMAL NOT NULL
category        VARCHAR NOT NULL          ← see category reference below
expense_date    DATE NOT NULL
notes           VARCHAR
created_by      UUID FK → user NOT NULL
updated_by      UUID FK → user
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Expense category reference

```
Trip direct (linked to trip_id):
  FUEL | TOLL | CLEANING | OTHER_TRIP

Truck overhead (trip_id = null, org level):
  MAINTENANCE | TYRE | BREAKDOWN | TAX | FASTAG | OTHER_TRUCK

Personal/household (trip_id = null):
  HOUSEHOLD | GROCERY | MEDICAL | OTHER_PERSONAL
```

### How role-based expense filtering works
- BUSINESS user → sees expenses where category IN (FUEL, TOLL, CLEANING, OTHER_TRIP, MAINTENANCE, TYRE, BREAKDOWN, TAX, FASTAG, OTHER_TRUCK)
- PERSONAL user → sees expenses where category IN (HOUSEHOLD, GROCERY, MEDICAL, OTHER_PERSONAL)
- ADMIN → sees all expenses for the organisation
- Filtering is by category field, NOT by who created it — admin can create any category and it will appear in the correct view

---

## 5. Architecture

### Type
Single full-stack **Next.js** application (App Router, TypeScript) — frontend UI and backend API live in one repository and one deployment. Chosen because:
- Single organisation, three users — no scaling requirement
- Solo developer — one codebase, one language (TypeScript), one deployment
- MVP target under 4 weeks
- Codebase expected to be under 5000 lines
- Frontend and API share the same origin on Vercel — no CORS configuration, simple HttpOnly cookie handling

### Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + TypeScript |
| API | Next.js Route Handlers under `app/api/v1/...` (Node.js runtime) |
| UI | React + Tailwind CSS (mobile-first), PWA via Serwist |
| Client data fetching | TanStack Query + a thin fetch wrapper with automatic token refresh |
| Database | PostgreSQL (Neon, via Vercel Marketplace) |
| ORM / migrations | Prisma (`prisma migrate`) |
| Validation | Zod (shared schemas between API and forms) |
| Password hashing | bcryptjs (pure JS — safe on Vercel serverless) |
| JWT | jose (sign + verify access tokens) |
| API docs | OpenAPI generated from Zod schemas (zod-to-openapi), served with Swagger UI at `/api/docs` |
| Logging | pino (structured JSON logs, visible in Vercel Logs) |
| Testing | Vitest (unit + integration) |
| Hosting | Vercel (serverless functions + CDN) |

### Project structure (domain-first, then layers)
```
brook/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                  ← admin seeding
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth/            (login, refresh, logout)
│   │   │   │   ├── organisation/    (users, truck)
│   │   │   │   ├── trips/
│   │   │   │   ├── expenses/
│   │   │   │   └── payments/
│   │   │   ├── health/route.ts      ← health check
│   │   │   └── docs/route.ts        ← Swagger UI / OpenAPI JSON
│   │   ├── (auth)/login/            ← login page
│   │   ├── (admin)/                 ← admin pages (trips, expenses, overhead, household)
│   │   ├── (business)/              ← father's simplified expense entry UI
│   │   └── (personal)/              ← mom's simplified expense entry UI
│   ├── modules/                     ← domain logic, framework-agnostic
│   │   ├── auth/            (service, repository, schemas, jwt, cookies)
│   │   ├── organisation/    (service, repository, schemas)
│   │   ├── trip/            (service, repository, schemas)
│   │   ├── expense/         (service, repository, schemas)
│   │   └── payment/         (service, repository, schemas)
│   ├── common/                      ← shared errors, error handler, withAuth, pagination, money utils, logger
│   ├── lib/                         ← prisma client singleton, env validation
│   └── middleware.ts                ← route protection + role-based page redirects
└── tests/
```

Route Handlers are thin: parse + validate input, call the service in `modules/`, return the DTO. All business logic lives in `modules/*/service.ts`. This keeps domain code independent of Next.js and allows clean extraction into a separate service later if needed.

### Authentication
- JWT access token — short lived (15 minutes), stateless, verified with `jose` in the `withAuth` wrapper on every protected Route Handler
- Refresh token — long lived (7 days), stored in DB, sent via HttpOnly, Secure, SameSite=Strict cookie scoped to `/api/v1/auth`
- On logout — refresh token deleted from DB and cookie cleared
- On refresh — new access token issued, refresh token rotated (old deleted, new issued) inside a single DB transaction
- Access token is returned in the login/refresh response body and held in client memory (never localStorage); on page load the client calls `/auth/refresh` to restore the session
- Role stored in JWT claims — frontend reads role to adapt UI
- Backend enforces role via the `withAuth([...roles])` wrapper on every Route Handler — frontend role check and `middleware.ts` page redirects are UI only, never security

### Key design decisions & reasoning

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth vs business first | Auth first | Every new endpoint needs security configured once |
| Expense table unified | One table, category field | Same structure for all expense types, scalable |
| Payment separate from expense | Separate entity | Payments have trip-specific fields (type, received_date) |
| Truck overhead separate from trip | Category field, no trip_id | Overhead is not attributable to a single trip |
| Revenue calculated in backend | Service layer calculation (`modules/trip/service.ts`) | Business logic in one place, consistent across all clients |
| Pagination on all list endpoints | `page` + `size` query params, Prisma `skip`/`take` | Prevents full table scans as data grows |
| Date filtering on list endpoints | `startDate` / `endDate` query params | Minimum needed for monthly reports — not advanced filtering |
| Single Next.js app over separate frontend + backend | Next.js full-stack | Scale, team size, timeline; one deploy, same origin |
| PWA over native app | Next.js PWA (Serwist) | Developer familiarity, no app store, offline support |
| DB seeding for admin | `prisma/seed.ts` (idempotent) | No chicken-and-egg setup endpoint problem |
| Custom JWT auth over Auth.js | `jose` + `bcryptjs` + DB refresh tokens | Preserves the exact access/refresh/rotation design and API contract |
| Node.js runtime for API routes | Not Edge | Prisma and bcryptjs need Node.js runtime |
| Pooled DB connections | Neon pooled connection string | Serverless functions open many short-lived connections |
| Atomic multi-step writes | `prisma.$transaction` | Status change + auto in-between trip, and refresh token rotation must be all-or-nothing |

---

## 6. Complete API Reference

Base path: `/api/v1` (implemented as Next.js Route Handlers at `src/app/api/v1/...`)

Role legend: 🔴 ADMIN · 🟡 ADMIN + BUSINESS · 🟢 All roles · ⚪ Public

---

### Auth `/api/v1/auth`

**POST /auth/login** ⚪
```json
Request:  { "email": "string", "password": "string" }
Response: { "accessToken": "string", "role": "string", "name": "string" }
Note: refresh token returned as HttpOnly cookie
```

**POST /auth/refresh** ⚪
```json
Request:  refresh token sent automatically via HttpOnly cookie
Response: { "accessToken": "string" }
```

**POST /auth/logout** 🟢
```json
Request:  refresh token sent automatically via HttpOnly cookie
Response: { "message": "Logged out successfully" }
Note: deletes refresh token from DB
```

---

### Organisation `/api/v1/organisation`

**POST /organisation/users** 🔴
```json
Request:  { "name": "string", "phone": "string", "email": "string", "password": "string", "role": "BUSINESS|PERSONAL" }
Response: { "id": "uuid", "name": "string", "role": "string", "createdAt": "date" }
```

**GET /organisation/users** 🔴
```json
Response: [ { "id": "uuid", "name": "string", "role": "string", "phone": "string" } ]
```

**PATCH /organisation/users/{id}** 🔴
```json
Request:  any subset of { "name": "string", "phone": "string", "password": "string" }
```

**DELETE /organisation/users/{id}** 🔴

**GET /organisation/truck** 🔴
```json
Response: { "id": "uuid", "regNumber": "string", "model": "string" }
```

**PATCH /organisation/truck/{id}** 🔴
```json
Request: any subset of { "regNumber": "string", "model": "string" }
```

---

### Trips `/api/v1/trips`

**POST /trips** 🔴
```json
Request:
{
  "truckId": "uuid",
  "brokerName": "string",
  "ratePerTon": 1200.00,
  "agreedWeight": 20.5,
  "startDate": "2024-01-15"
}
Response: full trip object, status defaults to ORDER_RECEIVED, paymentReceived defaults to false
```

**GET /trips?page=0&size=20&startDate=date&endDate=date** 🔴
```json
Response:
{
  "content": [ ...trip objects ],
  "page": 0, "size": 20, "totalElements": 45, "totalPages": 3
}
```

**GET /trips/active** 🟡
```json
Response: [ trips where status NOT IN (COMPLETED) ]
Note: used by father to select which trip to attach an expense to
```

**GET /trips/{id}** 🔴
```json
Response:
{
  "id": "uuid",
  "brokerName": "string",
  "ratePerTon": 1200.00,
  "agreedWeight": 20.5,
  "actualWeight": 20.1,
  "shortagePenalty": 500.00,
  "brokeragePct": 5.5,
  "status": "COMPLETED",
  "startDate": "date",
  "endDate": "date",
  "paymentReceived": true,
  "createdBy": "string",
  "updatedBy": "string",
  "payments": [ { "id": "uuid", "amount": 0.00, "type": "ADVANCE|FINAL", "receivedDate": "date" } ],
  "expenses": [ { "id": "uuid", "amount": 0.00, "category": "string", "expenseDate": "date", "notes": "string" } ],
  "summary": {
    "totalRevenue": 23300.00,
    "totalExpenses": 6500.00,
    "grossProfit": 16800.00
  }
}
Note: grossProfit calculated in the trip service (backend), not frontend
```

**PATCH /trips/{id}** 🔴
```json
Request: any subset of updatable fields
{ "actualWeight": 20.1, "shortagePenalty": 500.00, "status": "string", "endDate": "date", "paymentReceived": true, "brokeragePct": 5.5 }
Note: when status changes to DELIVERED, system auto-creates an IN_BETWEEN trip (in the same DB transaction)
```

**DELETE /trips/{id}** 🔴

---

### Expenses `/api/v1/expenses`

**POST /expenses** 🟢
```json
Request:
{
  "amount": 4500.00,
  "category": "FUEL",
  "tripId": "uuid",          ← nullable
  "expenseDate": "2024-01-15",
  "notes": "string"
}
Response: full expense object with createdBy resolved to user name
```

**GET /expenses?page=0&size=20&startDate=date&endDate=date** 🟢
```json
Filtering by role (automatic, backend applies based on JWT role):
  ADMIN    → all expenses for org
  BUSINESS → categories: FUEL, TOLL, CLEANING, OTHER_TRIP, MAINTENANCE, TYRE, BREAKDOWN, TAX, FASTAG, OTHER_TRUCK
  PERSONAL → categories: HOUSEHOLD, GROCERY, MEDICAL, OTHER_PERSONAL
```

**GET /expenses/{id}** 🟢

**GET /expenses/trip/{tripId}** 🟡
```json
Response: all expenses linked to a specific trip
```

**PATCH /expenses/{id}** 🔴
```json
Request: any subset of { "amount": 0.00, "category": "string", "notes": "string", "tripId": "uuid" }
Note: admin enriches/corrects expenses entered by father or mom
```

**DELETE /expenses/{id}** 🔴

---

### Payments `/api/v1/payments`

**POST /payments** 🔴
```json
Request: { "tripId": "uuid", "amount": 0.00, "type": "ADVANCE|FINAL", "receivedDate": "date" }
```

**GET /payments/trip/{tripId}** 🔴
```json
Response: [ all payments for a trip in chronological order ]
```

**PATCH /payments/{id}** 🔴

**DELETE /payments/{id}** 🔴

---

## 7. Cross-Cutting Concerns

| Concern | Implementation |
|---------|---------------|
| JWT validation | `withAuth()` wrapper in `common/` verifies the Bearer token with `jose` on every protected Route Handler |
| Role enforcement | `withAuth(['ADMIN'])`, `withAuth(['ADMIN','BUSINESS'])`, etc. on each Route Handler; `middleware.ts` only redirects pages for UX |
| Input validation | Zod schemas in each module, parsed in the Route Handler before calling the service |
| Global error handling | `withErrorHandler()` wrapper in `common/` maps custom errors (NotFound, Forbidden, Validation, etc.) and ZodError to the standard error response |
| API docs | OpenAPI generated from Zod schemas, Swagger UI at `/api/docs` |
| Logging | pino — service layer, output to Vercel Logs |
| Health check | `GET /api/health` (checks DB connectivity) |
| Pagination | `page` + `size` query params parsed by a shared `parsePagination()` helper; response shape `{ content, page, size, totalElements, totalPages }` |
| Date filtering | `startDate` + `endDate` query params, validated by Zod |
| Environment config | Vercel environments (Development / Preview / Production) + environment variables for secrets, validated at startup with Zod in `lib/env.ts` |

### Environment variables
```
DATABASE_URL        ← pooled Postgres connection string (runtime)
DIRECT_URL          ← direct Postgres connection string (migrations)
JWT_SECRET          ← access token signing secret
ADMIN_EMAIL         ← used by seed script
ADMIN_PASSWORD      ← used by seed script
ADMIN_NAME          ← used by seed script
ORG_NAME            ← used by seed script
```
Secrets are set in the Vercel project settings, never committed.

### Standard error response format
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Amount must be positive",
  "path": "/api/v1/expenses"
}
```

---

## 8. Testing Strategy

| Type | Tools | Scope |
|------|-------|-------|
| Unit | Vitest (with mocked repositories / Prisma) | Service layer business logic in isolation |
| Integration | Vitest + real PostgreSQL (local Docker or a Neon test branch) + Route Handlers invoked directly | Full request → route handler → service → DB |

### Critical unit tests
```
tripService.calculateGrossProfit()     ← most important test in the app
tripService.handleStatusTransition()   ← auto in-between trip logic
expenseService.filterByRole()          ← role based category filtering
authService.validateRefreshToken()     ← token rotation logic
```

### Critical integration tests
```
POST /auth/login                       ← happy path + wrong password
POST /auth/refresh                     ← valid + expired token
GET  /trips/{id}                       ← nested response + correct profit calculation
POST /expenses                         ← all three roles can create
GET  /expenses                         ← role based filtering verified end to end
```

---

## 9. Implementation Order

```
Week 1 — Foundation
  Next.js (App Router, TypeScript) setup · Tailwind · Vercel project + Neon Postgres
  Prisma schema + first migration (auth_user, user_role, refresh_token entities)
  Environment config (Zod-validated env, Vercel environments)
  Login · Refresh · Logout Route Handlers
  withAuth wrapper (jose) · middleware.ts
  withErrorHandler wrapper · Zod validation
  DB seeding (admin user + organisation + roles via prisma/seed.ts)

Week 2 — Business logic
  Organisation module (user + truck CRUD)
  Trip module (all endpoints + status lifecycle)
  Payment module
  Expense module
  Gross profit calculation in trip service
  Auto in-between trip on DELIVERED status (prisma.$transaction)

Week 3 — Frontend
  PWA setup (Serwist, manifest, icons)
  Access token in memory + refresh-on-load + auto-refresh on 401
  Admin: trip list · trip detail · expense views
  Father UI: simplified expense entry (big buttons + number pad)
  Mom UI: simplified household expense entry

Week 3.5 — Testing (runs alongside Week 3–4)
  Unit tests for all service business logic
  Integration tests for critical endpoints

Week 4 — Polish + Deploy
  Business expenditure view
  Household expenditure view
  Truck overhead view
  OpenAPI docs + Swagger UI
  Health check endpoint
  Vercel production deploy (build command, env vars, migrations, seed)
  Real data testing
```

---

## 10. Deployment (Vercel)

- Repository connected to Vercel; every push to `main` deploys to Production, every other branch/PR gets a Preview deployment
- Database: Neon Postgres provisioned through the Vercel Marketplace; use a separate database/branch for Preview and Development so real data is never touched by previews
- Build command: `prisma generate && prisma migrate deploy && next build`
- Seeding: run `prisma db seed` once after the first production deploy (seed script is idempotent — safe to run again, uses upserts for roles, organisation, and admin user)
- All API routes run on the Node.js runtime (`export const runtime = 'nodejs'`)
- Use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`
- Prisma client is created as a singleton in `lib/prisma.ts` to avoid exhausting connections
- Functions are stateless — no in-memory session or cache; all state lives in Postgres (refresh tokens) or the JWT
- Region: choose the Vercel function region closest to the database (and to India users, e.g. Mumbai `bom1`)
- HTTPS is enforced by Vercel, which is required for Secure cookies and PWA installation
- Rollback: redeploy a previous deployment from the Vercel dashboard (database migrations should stay backward compatible)

---

## 11. Coding Conventions

- All IDs are UUIDs
- All timestamps stored in UTC
- Money values stored as DECIMAL(10,2) — never float in production financial data. In code use Prisma `Decimal` (decimal.js) for all money arithmetic; never use JS `number` math for money. Serialise to numbers with two decimals only at the DTO boundary
- DTOs (Zod-validated request/response shapes) used for all request and response objects — Prisma models never returned directly
- created_by and updated_by on all entities for audit trail
- PATCH for partial updates — never PUT
- Endpoint naming: nouns only, no verbs in URL (use HTTP method as the verb)
- Folder naming: domain first (trip/, expense/) then layers (service, repository, schemas)
- Route Handlers stay thin — no business logic inside `app/api/**`
- TypeScript strict mode on; no `any` in service or repository code
- All list endpoints must support pagination via `page` + `size`
- All list endpoints must support date filtering via startDate + endDate params