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

  console.log('[inspect-drizzle] Connecting with:')
  if (usingDatabaseUrl) {
    console.log('  DATABASE_URL (redacted)')
  } else {
    const { password, ...publicCreds } = creds as any
    console.log(' ', publicCreds)
  }

  const client = new Client(creds as any)
  await client.connect()

  // Look for the table in drizzle or public schema
  const mz = await client.query(
    `SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = '__drizzle_migrations' AND table_schema IN ('drizzle','public') LIMIT 1`
  )

  if (mz.rowCount === 0) {
    console.log('[inspect-drizzle] __drizzle_migrations not found in drizzle or public schemas')
    await client.end()
    return
  }

  const { table_schema } = mz.rows[0]
  console.log('[inspect-drizzle] __drizzle_migrations found in schema:', table_schema)

  const cols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = '__drizzle_migrations' ORDER BY ordinal_position`,
    [table_schema]
  )
  console.log('[inspect-drizzle] Columns:')
  console.table(cols.rows)

  try {
    const rows = await client.query(`SELECT * FROM ${table_schema}.__drizzle_migrations ORDER BY created_at DESC LIMIT 20`)
    console.log('[inspect-drizzle] Sample rows:')
    console.table(rows.rows)
  } catch (e) {
    console.warn('[inspect-drizzle] Could not read contents:', (e as Error).message)
  }

  await client.end()
}

main().catch((e) => {
  console.error('[inspect-drizzle] Error:', (e as Error).message)
  process.exit(1)
})
