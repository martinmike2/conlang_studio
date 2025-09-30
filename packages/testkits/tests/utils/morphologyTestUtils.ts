import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/pglite"

import * as schema from "../../../db/schema/core"
import { createMorphologyService } from "@core/morphology"

const migrationFiles = [
  resolve(__dirname, "../../../db/migrations/0000_absurd_stranger.sql"),
  resolve(__dirname, "../../../db/migrations/0001_frame_roles.sql"),
  resolve(__dirname, "../../../db/migrations/0002_activity_log.sql")
]

export async function createMorphologyTestHarness() {
  const client = new PGlite()
  for (const file of migrationFiles) {
    const sql = readFileSync(file, "utf8")
    await client.exec(sql)
  }

  const db = drizzle(client, { schema })
  const service = createMorphologyService(db as any)

  return {
    service,
    db,
    async dispose() {
      await client.close()
    }
  }
}
