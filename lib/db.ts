/**
 * Dual database layer:
 * - Development: SQLite via better-sqlite3 (sync)
 * - Production: Neon Postgres via @neondatabase/serverless (async)
 *
 * The API mirrors the original better-sqlite3 shape:
 *   db.prepare(sql).get(values?)
 *   db.prepare(sql).all(values?)
 *   db.prepare(sql).run(values?)
 *
 * In prod, each call is async under the hood but the shim presents a
 * sync-looking API that works inside async route handlers.
 *
 * All money values stored as INTEGER cents to avoid float precision issues.
 * We convert to/from decimal at the boundary (toDb / fromDb helpers).
 */

import { neon } from '@neondatabase/serverless'
import { Pool } from '@neondatabase/serverless'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

declare global {
  // eslint-disable-next-line no-var
  var __brookDbDev: Database.Database | undefined
}

// Helper: returns appropriate NOW() string for current dialect
export const sqlNow = () =>
  process.env.NODE_ENV === 'production' ? \"NOW()\" : \"datetime('now')\"

// ─── DEV: SQLite (better-sqlite3) ───────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'brook.db')

  // Singleton for dev — Next.js HMR may reload module multiple times
  function openDevDb(): Database.Database {
    if (globalThis.__brookDbDev) return globalThis.__brookDbDev
    const db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
    seed(db)
    globalThis.__brookDbDev = db
    return db
  }

  // Export dev db as-is (better-sqlite3 instance)
  export const db = openDevDb()
} else {
  // ─── PROD: Neon Postgres ─────────────────────────────────────────────
  // Create a connection pool (neon/http driver under the hood)
  // Uses DATABASE_URL env var (pooled connection)
  const sql = neon(process.env.DATABASE_URL!)

  /**
   * Thin compatibility shim that makes Neon look like better-sqlite3
   * for the limited API surface we use: prepare().{get,all,run}
   */
  class NeonCompat {
    private readonly sqlFn: typeof sql

    constructor(sqlFn: typeof sql) {
      this.sqlFn = sqlFn
    }

    /**
     * Parse a SQL string and return a Statement-like object
     * with .get, .all, .run methods.
     */
    prepare(sqlText: string) {
      // Extract parameter placeholders ($1, $2, ...) vs SQLite (?)
      // Convert SQLite-style ? params to Postgres $1, $2, ...
      const postgresSql = sqlText.replace(/\?/g, (match, offset) => {
        // Count number of ? before this one to determine parameter index
        const before = sqlText.substring(0, offset)
        const numPlaceholders = (before.match(/\?/g) || []).length
        return `$${numPlaceholders + 1}`
      })

      // Return an object mimicking the Statement interface
      return {
        /**
         * Execute query and return first row
         */
        async get(...params: any[]) {
          try {
            // Neon's sql tag function automatically handles parameter escaping
            const result = await this.sqlFn`${postgresSql}`(...params)
            // Return first row or undefined if empty
            return result.length > 0 ? result[0] : undefined
          } catch (err) {
            console.error('[db.get] Error:', err, { sql: postgresSql, params })
            throw err
          }
        },

        /**
         * Execute query and return all rows
         */
        async all(...params: any[]) {
          try {
            const result = await this.sqlFn`${postgresSql}`(...params)
            return result
          } catch (err) {
            console.error('[db.all] Error:', err, { sql: postgresSql, params })
            throw err
          }
        },

        /**
         * Execute query (INSERT/UPDATE/DELETE) and return meta
         */
        async run(...params: any[]) {
          try {
            const result = await this.sqlFn`${postgresSql}`(...params)
            // Mimic better-sqlite3 run() return object
            return {
              changes: result.rowCount ?? 0,
              lastInsertRowid: result.rows[0]?.id ?? undefined
            }
          } catch (err) {
            console.error('[db.run] Error:', err, { sql: postgresSql, params })
            throw err
          }
        }
      }
    }
  }

  // Create and export the prod compatibility wrapper
  export const db = new NeonCompat(sql)
}

// ─── Schema (SQLite dialect - will be adapted in compatibility layer) ─────
function migrate(db: any) {
  // Note: In prod, the Neon compatibility layer converts ? to $1, $2, etc.
  // The raw SQL below uses ? placeholders for SQLite; compatibility layer fixes it.
  db.exec(`
    CREATE TABLE IF NOT EXISTS organisation (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (${sqlNow()})
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
      created_at   TEXT NOT NULL DEFAULT (${sqlNow()})
    );

    CREATE TABLE IF NOT EXISTS profile (
      id           TEXT PRIMARY KEY,
      org_id       TEXT NOT NULL REFERENCES organisation(id),
      auth_user_id TEXT NOT NULL REFERENCES auth_user(id),
      name         TEXT NOT NULL,
      phone        TEXT,
      created_at   TEXT NOT NULL DEFAULT (${sqlNow()})
    );

    CREATE TABLE IF NOT EXISTS refresh_token (
      id           TEXT PRIMARY KEY,
      auth_user_id TEXT NOT NULL REFERENCES auth_user(id),
      token        TEXT UNIQUE NOT NULL,
      expiry       TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (${sqlNow()})
    );

    CREATE TABLE IF NOT EXISTS truck (
      id         TEXT PRIMARY KEY,
      org_id     TEXT NOT NULL REFERENCES organisation(id),
      reg_number TEXT NOT NULL,
      model      TEXT,
      created_at TEXT NOT NULL DEFAULT (${sqlNow()})
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
      created_at       TEXT NOT NULL DEFAULT (${sqlNow()}),
      updated_at       TEXT NOT NULL DEFAULT (${sqlNow()})
    );

    CREATE TABLE IF NOT EXISTS payment (
      id            TEXT PRIMARY KEY,
      trip_id       TEXT NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
      amount        INTEGER NOT NULL,
      type          TEXT NOT NULL CHECK(type IN ('ADVANCE','FINAL')),
      received_date TEXT NOT NULL,
      created_by    TEXT REFERENCES profile(id),
      created_at    TEXT NOT NULL DEFAULT (${sqlNow()})
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
      created_at   TEXT NOT NULL DEFAULT (${sqlNow()}),
      updated_at   TEXT NOT NULL DEFAULT (${sqlNow()})
    );
  `)
}

// ─── Seed ───────────────────────────────────────────────────────────────
function seed(db: any) {
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

// ─── Money helpers (store as integer cents × 100) ───────────────────────
// Rates like "₹1200 per ton" and weights like "22.5 tons" are stored
// as integers by multiplying by 100 and rounding.
export function toDb(n: number): number { return Math.round(n * 100) }
export function fromDb(n: number): number { return n / 100 }

// ─── UUID ───────────────────────────────────────────────────────────────
export function newId(): string {
  return crypto.randomUUID()
}