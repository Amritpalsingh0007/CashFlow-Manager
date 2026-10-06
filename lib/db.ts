/**
 * SQLite database layer using better-sqlite3.
 *
 * The DB file lives at DB_PATH (default: ./brook.db next to the project root).
 * On first run, schema is created and the admin user is seeded from env vars.
 *
 * All money values stored as INTEGER cents to avoid float precision issues.
 * We convert to/from decimal at the boundary (toDb / fromDb helpers).
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'brook.db')

// Singleton — Next.js may import this module multiple times in dev (HMR).
// We attach it to globalThis so the same connection is reused.
declare global {
  // eslint-disable-next-line no-var
  var __brookDb: Database.Database | undefined
}

function openDb(): Database.Database {
  if (globalThis.__brookDb) return globalThis.__brookDb
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  seed(db)
  globalThis.__brookDb = db
  return db
}

export const db = openDb()

// ─── Schema ───────────────────────────────────────────────────────────────────

function migrate(db: Database.Database) {
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
      broker_name      TEXT NOT NULL,
      rate_per_ton     INTEGER NOT NULL,
      agreed_weight    INTEGER NOT NULL,
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

// ─── Seed ─────────────────────────────────────────────────────────────────────

function seed(db: Database.Database) {
  // Only seed if org doesn't exist yet
  const orgExists = db.prepare('SELECT id FROM organisation WHERE id = ?').get('org-1')
  if (orgExists) return

  // Lazy import bcryptjs here — only runs once at startup
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require('bcryptjs') as typeof import('bcryptjs')

  const adminEmail    = process.env.ADMIN_EMAIL    ?? 'raj@brook.app'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123'
  const adminName     = process.env.ADMIN_NAME     ?? 'Raj'
  const orgName       = process.env.ORG_NAME       ?? 'Brook Transport'
  const truckReg      = process.env.TRUCK_REG      ?? 'MH-12-AB-1234'
  const truckModel    = process.env.TRUCK_MODEL     ?? 'Tata Prima'

  const hashedPassword = bcrypt.hashSync(adminPassword, 10)
  const now = new Date().toISOString()

  db.transaction(() => {
    db.prepare(`INSERT INTO organisation (id, name, created_at) VALUES (?,?,?)`).run('org-1', orgName, now)
    db.prepare(`INSERT INTO user_role   (id, role) VALUES (?,?)`).run('role-admin',    'ADMIN')
    db.prepare(`INSERT INTO user_role   (id, role) VALUES (?,?)`).run('role-business', 'BUSINESS')
    db.prepare(`INSERT INTO user_role   (id, role) VALUES (?,?)`).run('role-personal', 'PERSONAL')
    db.prepare(`INSERT INTO auth_user   (id, email, password, role_id, created_at) VALUES (?,?,?,?,?)`).run('auth-admin', adminEmail, hashedPassword, 'role-admin', now)
    db.prepare(`INSERT INTO profile     (id, org_id, auth_user_id, name, created_at) VALUES (?,?,?,?,?)`).run('profile-admin', 'org-1', 'auth-admin', adminName, now)
    db.prepare(`INSERT INTO truck       (id, org_id, reg_number, model, created_at) VALUES (?,?,?,?,?)`).run('truck-1', 'org-1', truckReg, truckModel, now)
  })()

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
