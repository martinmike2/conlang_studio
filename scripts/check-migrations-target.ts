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

  console.log('[check-migrations] Connecting with:')
  if (usingDatabaseUrl) {
    console.log('  DATABASE_URL (redacted)')
  } else {
    // don't print password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...publicCreds } = creds as any
    console.log(' ', publicCreds)
  }

  const client = new Client(creds as any)
  await client.connect()

  const dbInfo = await client.query(`SELECT current_database() as db, inet_server_addr() as server_addr, inet_server_port() as server_port`)
  console.log('[check-migrations] Server reported:', dbInfo.rows[0])

  const tables = [
    'orthographies',
    'orthography_samples',
    'tone_targets',
    'tone_associations',
    'pattern_sets',
    'pattern_set_members',
    'root_pattern_requirements'
  ]

  const q = `SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema IN ('public','drizzle') AND table_name = ANY($1)`
  const r = await client.query(q, [tables])
  const found = r.rows.map((rr: any) => `${rr.table_schema}.${rr.table_name}`)
  console.log('[check-migrations] Found tables (schema.name):', found)

  const missing = tables.filter(t => !r.rows.some((rr: any) => rr.table_name === t))
  console.log('[check-migrations] Missing tables:', missing)

  // Check for drizzle migrations table in drizzle schema or public
  const mz = await client.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = '__drizzle_migrations' LIMIT 1`)
  if (mz.rowCount === 0) {
    console.log('[check-migrations] __drizzle_migrations table not found')
  } else {
    const { table_schema } = mz.rows[0]
    console.log('[check-migrations] __drizzle_migrations found in schema:', table_schema)
    try {
      // discover available columns
      const cols = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = '__drizzle_migrations' ORDER BY ordinal_position`,
        [table_schema]
      )
      const colNames = cols.rows.map((r: any) => r.column_name)
      const selectCols = colNames.length ? colNames.join(', ') : '*'
      const ms = await client.query(`SELECT ${selectCols} FROM ${table_schema}.__drizzle_migrations ORDER BY created_at DESC LIMIT 20`)
      console.log('[check-migrations] Recent migration records:')
      console.table(ms.rows)
    } catch (e) {
      console.warn('[check-migrations] Could not read __drizzle_migrations contents:', (e as Error).message)
    }
  }

  await client.end()
}

main().catch((e) => {
  console.error('[check-migrations] Error:', (e as Error).message)
  process.exit(1)
})
