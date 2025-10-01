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
    console.log('[manual-bootstrap] No SQL migration files found in', migrationsDir)
    await client.end()
    return
  }

  console.log('[manual-bootstrap] Applying', files.length, 'migration files from', migrationsDir)

  try {
    await client.query('BEGIN')
    for (const file of files) {
      const fp = path.join(migrationsDir, file)
      console.log('[manual-bootstrap] Running', file)
      const content = fs.readFileSync(fp, 'utf8')
      // split by explicit statement-breakpoint marker used in these SQL files
      const parts = content.split('--> statement-breakpoint')
      for (const part of parts) {
        const stmt = part.trim()
        if (!stmt) continue
        // execute statement (may contain trailing semicolon)
        await client.query(stmt)
      }
    }
    await client.query('COMMIT')
    console.log('[manual-bootstrap] All migrations applied successfully.')
  } catch (e) {
    console.error('[manual-bootstrap] Error applying migrations:', (e as Error).message)
    await client.query('ROLLBACK')
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(e => {
  console.error('[manual-bootstrap] Fatal:', (e as Error).message)
  process.exit(1)
})
