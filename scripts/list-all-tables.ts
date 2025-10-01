import 'dotenv/config'
import { Client } from 'pg'

async function main() {
  const usingDatabaseUrl = !!process.env.DATABASE_URL
  const creds = usingDatabaseUrl
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'app',
        password: process.env.DB_PASSWORD || 'dev',
        database: process.env.DB_NAME || 'conlang_studio'
      }

  console.log('[list-tables] Connecting with:')
  if (usingDatabaseUrl) {
    console.log('  DATABASE_URL (redacted)')
  } else {
    const { password, ...publicCreds } = creds as any
    console.log(' ', publicCreds)
  }

  const client = new Client(creds as any)
  await client.connect()

  const q = `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name`
  const r = await client.query(q)
  console.log('[list-tables] Found', r.rowCount, 'tables:')
  console.table(r.rows.slice(0, 200))

  await client.end()
}

main().catch((e) => {
  console.error('[list-tables] Error:', (e as Error).message)
  process.exit(1)
})
