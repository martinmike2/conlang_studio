import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { Client } from 'pg'
import { ensureEnv } from '@core/env'

async function main() {
  ensureEnv()
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'dev',
    database: process.env.DB_NAME || 'conlang_studio'
  })
  await client.connect()
  const schemaExists = await client.query("select schema_name from information_schema.schemata where schema_name='drizzle'")
  if (!schemaExists.rowCount) {
    await client.query('CREATE SCHEMA drizzle')
  }
  const journal = await client.query("SELECT relname FROM pg_class WHERE relname='_journal'")
  if (journal.rowCount) {
    console.log('[bootstrap] Journal already exists, aborting to prevent double-apply.')
    await client.end();
    return
  }
  function findRepoRoot(start: string): string {
    let cur: string | undefined = start
    while (cur && cur !== '/' && cur !== '.') {
      if (existsSync(join(cur, 'pnpm-workspace.yaml'))) return cur
      const parent = dirname(cur)
      if (parent === cur) break
      cur = parent
    }
    return start
  }
  const cwd = process.cwd()
  const insideDb = /[\\/]packages[\\/]db$/.test(cwd)
  const repoRoot = insideDb ? dirname(dirname(cwd)) : findRepoRoot(cwd)
  const candidates = insideDb
    ? [ join(cwd, 'migrations') ]
    : [ join(repoRoot, 'packages', 'db', 'migrations') ]
  let dir: string | null = null
  for (const c of candidates) if (existsSync(c)) { dir = c; break }
  if (!dir) {
    console.error('[bootstrap] Could not locate migrations directory. Tried:', candidates)
    await client.end(); process.exit(1); return
  }
  const files = readdirSync(dir).filter(f => /^\d+.*\.sql$/.test(f)).sort()
  console.log(`[bootstrap] Applying ${files.length} migration files manually from ${dir} ...`)
  await client.query('BEGIN')
  try {
    for (const f of files) {
      const sql = readFileSync(join(dir, f), 'utf8')
      console.log('[bootstrap] Running', f)
      await client.query(sql)
    }
    await client.query('COMMIT')
    console.log('[bootstrap] Complete. You may now run drizzle-kit migrate going forward.')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[bootstrap] Failed:', e)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main()