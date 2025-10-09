import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/pglite"

import * as schema from "../../../db/schema/core"
import { createDiachronyService } from "@core/diachrony"

const migrationFiles = [
  "0000_absurd_stranger.sql",
  "0001_frame_roles.sql",
  "0002_activity_log.sql",
  "0014_diachrony_logs.sql"
].map(file => resolve(__dirname, `../../../db/migrations/${file}`))

export async function createDiachronyTestHarness() {
  const client = new PGlite()
  for (const file of migrationFiles) {
    const sql = readFileSync(file, "utf8")
    await client.exec(sql)
  }

  const db = drizzle(client, { schema })
  const service = createDiachronyService(db as any)

  return {
    db,
    service,
    async dispose() {
      await client.close()
    }
  }
}
