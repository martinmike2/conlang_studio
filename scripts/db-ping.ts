import { getPool } from '../packages/db/client'

(async () => {
  try {
    const pool = getPool()
    console.log('[db-ping] Connecting with:')
    console.log(' ', {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'app',
      database: process.env.DB_NAME || 'conlang_studio'
    })

    const res = await pool.query('SELECT 1 AS ping')
    console.log('[db-ping] Server reported:', res.rows[0])

    // Close the pool for this short-lived script
    await pool.end()
  } catch (error) {
    console.error('[db-ping] Error connecting to the database:', error)
    process.exit(1)
  }
})();