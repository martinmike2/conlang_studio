import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/pglite"

import * as schema from "../../../db/schema/core"
import { createMorphologyService } from "@core/morphology"

const migrationFiles = [
  resolve(__dirname, "../../../db/migrations/0000_absurd_stranger.sql"),
  resolve(__dirname, "../../../db/migrations/0001_frame_roles.sql"),
  resolve(__dirname, "../../../db/migrations/0002_activity_log.sql"),
  resolve(__dirname, "../../../db/migrations/0003_validation_extensions.sql"),
  resolve(__dirname, "../../../db/migrations/0004_metrics_scaffolding.sql"),
  resolve(__dirname, "../../../db/migrations/0005_borrowing_contact_events.sql"),
  resolve(__dirname, "../../../db/migrations/0006_borrowing_loan_rulesets.sql"),
  resolve(__dirname, "../../../db/migrations/0007_style_policies.sql"),
  resolve(__dirname, "../../../db/migrations/0008_code_switch_profiles.sql"),
  resolve(__dirname, "../../../db/migrations/0009_loan_flags.sql"),
  resolve(__dirname, "../../../db/migrations/0010_variant_overlays.sql"),
  resolve(__dirname, "../../../db/migrations/0011_variant_overlays_created_at_index.sql"),
  resolve(__dirname, "../../../db/migrations/0012_variant_overlays_language_name_unique.sql"),
  resolve(__dirname, "../../../db/migrations/0013_auth_and_user_languages.sql"),
  resolve(__dirname, "../../../db/migrations/0014_diachrony_logs.sql"),
  resolve(__dirname, "../../../db/migrations/0015_collab_events.sql"),
  resolve(__dirname, "../../../db/migrations/0016_rule_dependencies.sql")
]

export async function createCoreTestDb() {
  const client = new PGlite()
  for (const file of migrationFiles) {
    const sql = readFileSync(file, "utf8")
    await client.exec(sql)
  }

  const db = drizzle(client, { schema })
  // Ensure the returned db object exposes the schema tables as properties
  // so callers that access (db as any).variantOverlays work in tests.
  Object.assign(db as any, schema)
  return {
    db,
    async dispose() {
      await client.close()
    }
  }
}

export async function createMorphologyTestHarness() {
  const { db, dispose } = await createCoreTestDb()
  const service = createMorphologyService(db as any)

  return {
    service,
    db,
    dispose
  }
}
