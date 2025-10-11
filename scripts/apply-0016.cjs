const { Pool } = require('pg');
require('dotenv/config');

const sql = `
CREATE TABLE IF NOT EXISTS "rule_dependencies" (
    "id" serial PRIMARY KEY,
    "language_id" integer NOT NULL,
    "rule_type" text NOT NULL,
    "rule_id" integer NOT NULL,
    "depends_on_type" text NOT NULL,
    "depends_on_id" integer NOT NULL,
    "relation_type" text NOT NULL,
    "explanation" text,
    "weight" integer DEFAULT 1,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "rule_dependencies_unique" ON "rule_dependencies" ("rule_type", "rule_id", "depends_on_type", "depends_on_id", "relation_type");
CREATE INDEX IF NOT EXISTS "rule_dependencies_language_idx" ON "rule_dependencies" ("language_id");
CREATE INDEX IF NOT EXISTS "rule_dependencies_rule_idx" ON "rule_dependencies" ("rule_type", "rule_id");
CREATE INDEX IF NOT EXISTS "rule_dependencies_depends_on_idx" ON "rule_dependencies" ("depends_on_type", "depends_on_id");
`;

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'conlang_user',
    password: process.env.DB_PASSWORD || 'conlang_pass',
    database: process.env.DB_NAME || 'conlang_db'
  });

  try {
    console.log('Applying migration 0016...');
    await pool.query(sql);
    console.log('✅ Migration 0016 applied successfully');
    
    // Mark it as applied in drizzle
    await pool.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      ['0016_rule_dependencies.sql', Date.now()]
    );
    console.log('✅ Migration 0016 marked as applied');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
