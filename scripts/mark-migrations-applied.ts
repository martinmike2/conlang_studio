import 'dotenv/config'
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'dev',
    database: process.env.DB_NAME || 'conlang_studio'
  })
  await client.connect()

  const migrationsDir = path.resolve(__dirname, '..', 'packages', 'db', 'migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  if (files.length === 0) {
    console.log('[mark-migrations] No SQL migration files found in', migrationsDir)
    await client.end()
    return
  }

  // Ensure drizzle schema exists
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`)

  // Ensure table exists with expected minimal columns (id serial, hash text, created_at bigint)
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text,
      created_at bigint
    )
  `)

  // Read existing hashes
  const existing = await client.query(`SELECT hash FROM drizzle.__drizzle_migrations`)
  const existingSet = new Set(existing.rows.map(r => r.hash))

  const toInsert = files.filter(f => !existingSet.has(f))
  if (toInsert.length === 0) {
    console.log('[mark-migrations] All migrations already recorded in drizzle.__drizzle_migrations')
    await client.end()
    return
  }

  console.log('[mark-migrations] Will insert', toInsert.length, 'migration records')

  try {
    await client.query('BEGIN')
    for (const f of toInsert) {
      const createdAt = Date.now()
      await client.query(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`, [f, createdAt])
      console.log('[mark-migrations] Inserted', f)
    }
    await client.query('COMMIT')
    console.log('[mark-migrations] Done.')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[mark-migrations] Failed:', (e as Error).message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(e => {
  console.error('[mark-migrations] Fatal:', (e as Error).message)
  process.exit(1)
})
