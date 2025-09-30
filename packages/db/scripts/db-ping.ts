import { ensureEnv } from '@core/env'
import { Client } from 'pg'

ensureEnv()

async function main() {
  const start = Date.now()
  const host = process.env.DB_HOST || 'localhost'
  const port = Number(process.env.DB_PORT) || 5432
  const user = process.env.DB_USER || 'app'
  const password = process.env.DB_PASSWORD || 'dev'
  const database = process.env.DB_NAME || 'conlang_studio'
  const client = new Client({ host, port, user, password, database })
  try {
    await client.connect()
    const { rows } = await client.query('select 1 as ok')
    console.log('[db-ping] success', { rows, ms: Date.now() - start })
  } catch (e: any) {
    console.error('[db-ping] failed', e.code || e.message)
    console.error('[db-ping] attempted', { host, port, user, database })
    process.exitCode = 1
  } finally {
    try { await client.end() } catch {}
  }
}

main()