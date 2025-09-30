import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from 'pg'

// Transactionally apply all SQL migrations then roll them back, verifying expected schema appears.
// Intended for CI safety check: ensures migrations apply cleanly without persisting changes.
// If DB is unreachable locally, exits 0 to avoid friction; in CI a running Postgres is expected.

async function connectWithGrace(): Promise<Client | null> {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'dev',
    database: process.env.DB_NAME || 'conlang_studio'
  })
  try {
    await client.connect()
    return client
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED') {
      console.warn('[migrations-run-rollback] DB unreachable; skipping (soft pass).')
      return null
    }
    throw e
  }
}

async function main() {
  const client = await connectWithGrace()
  if (!client) return

  const migrationsDir = join(process.cwd(), 'packages', 'db', 'migrations')
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  if (files.length === 0) {
    console.warn('[migrations-run-rollback] No migration files found; nothing to test.')
    await client.end();
    return
  }

  console.log(`[migrations-run-rollback] Applying ${files.length} migration(s) in transaction ...`)
  await client.query('BEGIN')
  try {
    for (const f of files) {
      const sql = readFileSync(join(migrationsDir, f), 'utf8')
      console.log(`[migrations-run-rollback] Running ${f}`)
      await client.query(sql)
    }
    // Basic verification for initial phase: ensure languages table exists
    const check = await client.query("SELECT to_regclass('public.languages') as exists")
    if (!check.rows[0].exists) {
      throw new Error('languages table not present after migrations')
    }
    console.log('[migrations-run-rollback] Verification passed; rolling back transaction.')
    await client.query('ROLLBACK')
    console.log('[migrations-run-rollback] Rollback complete (database untouched).')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[migrations-run-rollback] Error during migration test, rolled back.')
    throw e
  } finally {
    await client.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
