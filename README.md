# Brook — Personal & Business Cashflow Manager

> Separate your business and personal finances. Know if your business is actually making money.

---

## The Problem

Small truck transport businesses in India commonly mix personal and business finances into one bank account with no documentation. This makes it impossible to know the true profitability of the business or track household expenses accurately.

Brook solves this by separating three buckets of money — business trip revenue, truck overhead costs, and personal household expenses — into one clean, role-based application.

---

## Who Uses It

| User | Role | What they do |
|------|------|-------------|
| Raj (son) | ADMIN | Manages everything — trips, payments, reports, all expenses |
| Father | BUSINESS | Logs trip expenses on the go (fuel, toll, cleaning) |
| Mom | PERSONAL | Logs household expenses |

---

## Core Concept

A **Trip** is the heart of the business. Each trip has:
- A broker who arranges the order
- An agreed rate per ton × weight = expected revenue
- Direct expenses: fuel, toll, cleaning
- An advance payment mid-trip
- A final payment 7–15 days after delivery (after shortage penalty + brokerage deduction)

```
Trip Revenue    = Advance + Final payment
Trip Profit     = Trip Revenue - Trip direct expenses
Net Business    = Sum of all trip profits - Truck overhead (maintenance, tyres, taxes)
Monthly picture = Net Business - Personal/household expenses
```

Truck overhead (maintenance, breakdowns, tyres, taxes) is tracked separately — it is a cost of running the business, not attributed to any single trip.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) · TypeScript |
| API | Next.js Route Handlers (`/api/v1/...`) · Node.js runtime |
| Security | Custom JWT (`jose`) access token · Refresh token (DB stored, HttpOnly cookie) · `bcryptjs` |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Validation | Zod |
| Documentation | OpenAPI generated from Zod schemas (Swagger UI) |
| Monitoring | Health check endpoint · pino logs in Vercel Logs |
| Testing | Vitest (unit + integration) · PostgreSQL (test) |
| Frontend | React (Next.js) · Tailwind CSS · TanStack Query · PWA (Serwist) |
| Package manager | npm |
| Deployment | Vercel |

---

## Project Structure

```
brook/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    ← admin seeding
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth/          ← login, refresh, logout
│   │   │   │   ├── organisation/  ← users, truck
│   │   │   │   ├── trips/
│   │   │   │   ├── expenses/
│   │   │   │   └── payments/
│   │   │   ├── health/route.ts    ← health check
│   │   │   └── docs/route.ts      ← Swagger UI / OpenAPI JSON
│   │   ├── (auth)/login/          ← login page
│   │   ├── (admin)/               ← trips, expenses, overhead, household views
│   │   ├── (business)/            ← father's simplified expense entry UI
│   │   └── (personal)/            ← mom's simplified expense entry UI
│   ├── modules/                   ← domain logic (service, repository, schemas)
│   │   ├── auth/                  ← includes jwt + cookie helpers
│   │   ├── organisation/
│   │   ├── trip/
│   │   ├── expense/
│   │   └── payment/
│   ├── common/                    ← errors, withAuth, withErrorHandler, pagination, money utils, logger
│   ├── lib/                       ← prisma client singleton, env validation
│   └── middleware.ts              ← page route protection (UI only)
└── tests/
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (local, or a free Neon database)
- npm 10+

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/brook.git
cd brook

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Edit .env.local with your DB credentials and secrets
# DATABASE_URL=postgresql://your_username:your_password@localhost:5432/brook
# DIRECT_URL=postgresql://your_username:your_password@localhost:5432/brook
# JWT_SECRET=a_long_random_string
# ADMIN_EMAIL=admin@example.com
# ADMIN_PASSWORD=change_me
# ADMIN_NAME=Raj
# ORG_NAME=Your Family Business

# Run
npm run dev
```

The app (UI and API) runs at `http://localhost:3000`.

### Database Setup

```sql
CREATE DATABASE brook;
```

Tables are created by Prisma migrations:

```bash
npx prisma migrate dev
```

Admin user, roles, and organisation are seeded via `prisma/seed.ts` using credentials from `.env.local`:

```bash
npx prisma db seed
```

The seed script is idempotent — safe to run more than once.

### Frontend

There is no separate frontend project. The React UI lives in the same Next.js app (`src/app/`) and starts with `npm run dev`.

---

## API Overview

Base URL: `http://localhost:3000/api/v1`

Swagger UI: `http://localhost:3000/api/docs`

Health check: `http://localhost:3000/api/health`

| Module | Base Path |
|--------|-----------|
| Auth | `/api/v1/auth` |
| Organisation | `/api/v1/organisation` |
| Trips | `/api/v1/trips` |
| Expenses | `/api/v1/expenses` |
| Payments | `/api/v1/payments` |

Full API documentation is available in `REQUIREMENTS.md` and via Swagger UI when running locally.

---

## Environments

| Environment | Purpose |
|-------------|---------|
| Development | Local development using `.env.local` and a local PostgreSQL (or Neon dev branch) |
| Preview | Vercel preview deployment for every branch/PR, using a separate preview database |
| Production | Vercel production deployment, secrets set in Vercel project settings |

Sensitive values (DB URLs, JWT secret, admin credentials) are never hardcoded or committed — locally they live in `.env.local` (git-ignored), and in Vercel they are environment variables.

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm test -- unit

# Integration tests only
npm test -- integration
```

Integration tests need a PostgreSQL database; set `DATABASE_URL` to a local or test database before running them.

---

## Deployment

Brook is deployed on [Vercel](https://vercel.com).

1. Push the repository to GitHub and import it in Vercel.
2. Create a Neon Postgres database (Vercel → Storage / Marketplace) and connect it to the project.
3. Set environment variables in Vercel (Project Settings → Environment Variables):

   | Variable | Description |
   |----------|-------------|
   | `DATABASE_URL` | Pooled Postgres connection string |
   | `DIRECT_URL` | Direct Postgres connection string (used for migrations) |
   | `JWT_SECRET` | Access token signing secret |
   | `ADMIN_EMAIL` | Admin email used by the seed script |
   | `ADMIN_PASSWORD` | Admin password used by the seed script |
   | `ADMIN_NAME` | Admin display name |
   | `ORG_NAME` | Organisation name |

4. Set the build command to:

   ```bash
   prisma generate && prisma migrate deploy && next build
   ```

5. Deploy. After the first production deploy, seed the admin user once:

   ```bash
   npx prisma db seed
   ```

   (run locally with `DATABASE_URL` / `DIRECT_URL` pointing at the production database).

Every push to `main` deploys to Production; every other branch gets a Preview deployment. To roll back, redeploy a previous deployment from the Vercel dashboard.

---

## Project Status

- [x] System design complete
- [x] API contract defined
- [ ] Week 1 — Auth + foundation
- [ ] Week 2 — Trip + Payment + Expense modules
- [ ] Week 3 — Next.js PWA frontend
- [ ] Week 4 — Testing + Polish + Deploy to Vercel