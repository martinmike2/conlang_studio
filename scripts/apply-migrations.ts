import 'dotenv/config'
import { Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'dev',
    database: process.env.DB_NAME || 'conlang_studio'
  })
  console.log('[migrate] Connecting to database...')
  await client.connect()
  const db = drizzle(client)
  console.log('[migrate] Applying pending migrations (if any)...')
  await migrate(db, { migrationsFolder: './packages/db/migrations' })
  console.log('[migrate] Done.')
  await client.end()
}

main().catch(err => {
  console.error('[migrate] Failed:', err)
  process.exit(1)
})