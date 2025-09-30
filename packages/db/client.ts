import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema/core'
// Ensure repo-root .env is loaded before we read process.env for pool config
// (Next.js does not automatically traverse to monorepo root for env files.)
import { ensureEnv } from '@core/env'
ensureEnv()

// Singleton pattern to avoid creating multiple pools in dev hot reload
let _pool: Pool | undefined
let _db: ReturnType<typeof drizzle> | undefined

export function getPool() {
  if (!_pool) {
    _pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'app',
      password: process.env.DB_PASSWORD || 'dev',
      database: process.env.DB_NAME || 'conlang_studio'
    })
  }
  return _pool
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema })
  }
  return _db
}

export type DbClient = ReturnType<typeof getDb>
export { schema }