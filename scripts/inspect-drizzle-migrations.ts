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

  const client = new Client(creds as any)
  await client.connect()

  // find schema containing the table
  const mz = await client.query(`SELECT table_schema FROM information_schema.tables WHERE table_name = '__drizzle_migrations' LIMIT 1`)
  if (mz.rowCount === 0) {
    console.log('__drizzle_migrations not found')
    await client.end()
    return
  }
  const schema = mz.rows[0].table_schema
  console.log('__drizzle_migrations found in', schema)

  const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = '__drizzle_migrations' ORDER BY ordinal_position`, [schema])
  console.log('Columns:')
  console.table(cols.rows)

  try {
    const rows = await client.query(`SELECT * FROM ${schema}.__drizzle_migrations ORDER BY created_at DESC LIMIT 50`)
    console.log('Recent rows:', rows.rowCount)
    console.table(rows.rows)
  } catch (e) {
    console.error('Failed reading rows:', (e as Error).message)
    // fallback: try selecting all column names discovered
    if (cols.rowCount > 0) {
      const names = cols.rows.map(r => r.column_name).join(', ')
      try {
        const rows2 = await client.query(`SELECT ${names} FROM ${schema}.__drizzle_migrations ORDER BY 1 DESC LIMIT 20`)
        console.log('Fallback rows:')
        console.table(rows2.rows)
      } catch (e2) {
        console.error('Fallback also failed:', (e2 as Error).message)
      }
    }
  }

  await client.end()
}

main().catch(e => {
  console.error('Error:', (e as Error).message)
  process.exit(1)
})
