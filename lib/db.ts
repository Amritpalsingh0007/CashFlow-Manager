/**
 * Dual database layer:
 * - Development : SQLite via better-sqlite3 (sync)
 * - Production  : Neon Postgres via @neondatabase/serverless (async)
 *
 * Both expose the same async interface:
 *   await db.prepare(sql).get(...values)
 *   await db.prepare(sql).all(...values)
 *   await db.prepare(sql).run(...values)
 *
 * In development, the methods are async but they wrap synchronous calls.
 * In production, they are truly async.
 *
 * All money values stored as INTEGER (cents × 100) to avoid float errors.
 * Convert at the boundary with toDb / fromDb helpers.
 */

const IS_PROD = process.env.NODE_ENV === 'production'

// ─── Dialect helpers ──────────────────────────────────────────────────────────

/** Returns the SQL fragment for the current timestamp in the active dialect. */
export function sqlNow(): string {
  return IS_PROD ? 'NOW()' : "datetime('now')"
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface Statement {
  get(...values: unknown[]): Promise<unknown | undefined>
  all(...values: unknown[]): Promise<unknown[]>
  run(...values: unknown[]): Promise<{ changes: number; lastInsertRowid?: unknown }>
}

interface DbClient {
  prepare(sql: string): Statement
}

// ─── Production: Neon Postgres ───────────────────────────────────────────────

function buildNeonClient(): DbClient {
  const { Pool } = require('@neondatabase/serverless') as typeof import('@neondatabase/serverless')

  if (!process.env.DATABASE_URL) {
    throw new Error('[brook] DATABASE_URL must be set in production')
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  function toPostgres(sqlText: string): string {
    let n = 0
    return sqlText.replace(/\?/g, () => `$${++n}`)
  }

  return {
    prepare(sqlText: string): Statement {
      const pgSql = toPostgres(sqlText)
      return {
        async get(...values) {
          const res = await pool.query(pgSql, values as any[])
          return res.rows[0] ?? undefined
        },
        async all(...values) {
          const res = await pool.query(pgSql, values as any[])
          return res.rows
        },
        async run(...values) {
          const res = await pool.query(pgSql, values as any[])
          return { changes: res.rowCount ?? 0 }
        },
      }
    },
  }
}
// ─── Development: SQLite (better-sqlite3) ────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __brookDb: import('better-sqlite3').Database | undefined
}

function buildSqliteClient(): DbClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3')
  const path = require('path') as typeof import('path')

  const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'brook.db')

  // Singleton — Next.js HMR may import this module multiple times
  if (!globalThis.__brookDb) {
    const db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrateSqlite(db)
    seedSqlite(db)
    globalThis.__brookDb = db
  }

  // Wrap in our interface (make the sync methods async)
  const raw = globalThis.__brookDb!
  return {
    prepare(sqlText: string): Statement {
      const stmt = raw.prepare(sqlText)
      return {
        get: (...values: unknown[]): Promise<unknown | undefined> =>
          Promise.resolve(stmt.get(...values)),
        all: (...values: unknown[]): Promise<unknown[]> =>
          Promise.resolve(stmt.all(...values) as unknown[]),
        run: (...values: unknown[]): Promise<{ changes: number; lastInsertRowid?: unknown }> => {
          const result = stmt.run(...values)
          return Promise.resolve({
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
          })
        },
      }
    },
  }
}

// ─── Export the active db client ─────────────────────────────────────────────

export const db: DbClient = IS_PROD ? buildNeonClient() : buildSqliteClient()

// ─── SQLite schema + seed (dev only) ─────────────────────────────────────────

function migrateSqlite(db: import('better-sqlite3').Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organisation (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_role (
      id   TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('ADMIN','BUSINESS','PERSONAL'))
    );

    CREATE TABLE IF NOT EXISTS auth_user (
      id           TEXT PRIMARY KEY,
      email        TEXT UNIQUE NOT NULL,
      password     TEXT NOT NULL,
      role_id      TEXT NOT NULL REFERENCES user_role(id),
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profile (
      id           TEXT PRIMARY KEY,
      org_id       TEXT NOT NULL REFERENCES organisation(id),
      auth_user_id TEXT NOT NULL REFERENCES auth_user(id),
      name         TEXT NOT NULL,
      phone        TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_token (
      id           TEXT PRIMARY KEY,
      auth_user_id TEXT NOT NULL REFERENCES auth_user(id),
      token        TEXT UNIQUE NOT NULL,
      expiry       TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS truck (
      id         TEXT PRIMARY KEY,
      org_id     TEXT NOT NULL REFERENCES organisation(id),
      reg_number TEXT NOT NULL,
      model      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trip (
      id               TEXT PRIMARY KEY,
      org_id           TEXT NOT NULL REFERENCES organisation(id),
      truck_id         TEXT NOT NULL REFERENCES truck(id),
      trip_type        TEXT NOT NULL DEFAULT 'REVENUE' CHECK(trip_type IN ('REVENUE','IN_BETWEEN')),
      broker_name      TEXT,
      rate_per_ton     INTEGER,
      agreed_weight    INTEGER,
      actual_weight    INTEGER,
      shortage_penalty INTEGER NOT NULL DEFAULT 0,
      brokerage_pct    INTEGER NOT NULL DEFAULT 550,
      status           TEXT NOT NULL DEFAULT 'ORDER_RECEIVED',
      start_date       TEXT NOT NULL,
      end_date         TEXT,
      payment_received INTEGER NOT NULL DEFAULT 0,
      created_by       TEXT REFERENCES profile(id),
      updated_by       TEXT REFERENCES profile(id),
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment (
      id            TEXT PRIMARY KEY,
      trip_id       TEXT NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
      org_id        TEXT REFERENCES organisation(id),
      amount        INTEGER NOT NULL,
      type          TEXT NOT NULL CHECK(type IN ('ADVANCE','FINAL')),
      received_date TEXT NOT NULL,
      created_by    TEXT REFERENCES profile(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expense (
      id           TEXT PRIMARY KEY,
      org_id       TEXT NOT NULL REFERENCES organisation(id),
      trip_id      TEXT REFERENCES trip(id) ON DELETE SET NULL,
      amount       INTEGER NOT NULL,
      category     TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      notes        TEXT NOT NULL DEFAULT '',
      created_by   TEXT REFERENCES profile(id),
      updated_by   TEXT REFERENCES profile(id),
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function seedSqlite(db: import('better-sqlite3').Database) {
  // Only seed if org doesn't exist yet
  const orgExists = db.prepare('SELECT id FROM organisation WHERE id = ?').get('org-1')
  if (orgExists) return

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require('bcryptjs') as typeof import('bcryptjs')

  const adminEmail    = process.env.ADMIN_EMAIL    ?? 'raj@brook.app'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123'
  const adminName     = process.env.ADMIN_NAME     ?? 'Raj'
  const orgName       = process.env.ORG_NAME       ?? 'Brook Transport'
  const truckReg      = process.env.TRUCK_REG      ?? 'MH-12-AB-1234'
  const truckModel    = process.env.TRUCK_MODEL    ?? 'Tata Prima'

  const hashedPassword = bcrypt.hashSync(adminPassword, 10)
  const now = new Date().toISOString()

  // Note: We are not using a transaction here for simplicity.
  // The seed is idempotent and safe to run multiple times.
  db.prepare(`INSERT INTO organisation (id, name, created_at) VALUES (?,?,?)`).run('org-1', orgName, now)
  db.prepare(`INSERT INTO user_role   (id, role) VALUES (?,?)`).run('role-admin',    'ADMIN')
  db.prepare(`INSERT INTO user_role   (id, role) VALUES (?,?)`).run('role-business', 'BUSINESS')
  db.prepare(`INSERT INTO user_role   (id, role) VALUES (?,?)`).run('role-personal', 'PERSONAL')
  db.prepare(`INSERT INTO auth_user   (id, email, password, role_id, created_at) VALUES (?,?,?,?,?)`).run('auth-admin', adminEmail, hashedPassword, 'role-admin', now)
  db.prepare(`INSERT INTO profile     (id, org_id, auth_user_id, name, created_at) VALUES (?,?,?,?,?)`).run('profile-admin', 'org-1', 'auth-admin', adminName, now)
  db.prepare(`INSERT INTO truck       (id, org_id, reg_number, model, created_at) VALUES (?,?,?,?,?)`).run('truck-1', 'org-1', truckReg, truckModel, now)

  console.log(`[brook] Database seeded. Admin: ${adminEmail}`)
}

// ─── Money helpers (store as integer cents × 100) ────────────────────────────
// Rates like "₹1200 per ton" and weights like "22.5 tons" are stored
// as integers by multiplying by 100 and rounding.
export function toDb(n: number): number { return Math.round(n * 100) }
export function fromDb(n: number): number { return n / 100 }

// ─── UUID ─────────────────────────────────────────────────────────────────────
export function newId(): string {
  return crypto.randomUUID()
}