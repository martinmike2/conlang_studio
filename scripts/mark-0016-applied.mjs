import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'conlang_user',
    password: process.env.DB_PASSWORD || 'conlang_pass',
    database: process.env.DB_NAME || 'conlang_db'
  });

  try {
    // Check if migration 0016 is already marked
    const result = await pool.query(
      `SELECT * FROM drizzle.__drizzle_migrations WHERE hash = $1`,
      ['0016_rule_dependencies.sql']
    );
    
    if (result.rows.length > 0) {
      console.log('Migration 0016 already marked as applied');
    } else {
      // Insert the migration record
      await pool.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        ['0016_rule_dependencies.sql', Date.now()]
      );
      console.log('Successfully marked migration 0016 as applied');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
