import { describe, it, expect, afterEach } from "vitest"
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/pglite"

import * as schema from "../../db/schema/core"
import {
  createSemanticsService,
  subscribeSemanticsEvents,
  clearSemanticsEventSubscribers,
  type SemanticEventWithTimestamp
} from "@core/semantics"

const migrationFile = resolve(__dirname, "../../db/migrations/0000_absurd_stranger.sql")

async function createInMemoryService() {
  const client = new PGlite()
  const sql = readFileSync(migrationFile, "utf8")
  await client.exec(sql)

  const db = drizzle(client, { schema })
  const service = createSemanticsService(db as any)
  return {
    service,
    async dispose() {
      await client.close()
    }
  }
}

describe("SemanticsService", () => {
  afterEach(() => {
    clearSemanticsEventSubscribers()
  })

  it("supports frame, sense, and idiom CRUD", async () => {
    const { service, dispose } = await createInMemoryService()
    const events: SemanticEventWithTimestamp[] = []
    const unsubscribe = subscribeSemanticsEvents((event) => {
      events.push(event)
    })

    const frame = await service.createFrame({
      name: "Harvesting",
      slug: "harvesting",
      domain: "agriculture",
      description: "Harvest-related frames"
    })

    expect(frame.id).toBeGreaterThan(0)

    const listed = await service.listFrames()
    expect(listed).toHaveLength(1)
    expect(listed[0].slug).toBe("harvesting")

    const updatedFrame = await service.updateFrame(frame.id, { description: "Reaping and threshing" })
    expect(updatedFrame?.description).toBe("Reaping and threshing")

    const sense = await service.createSense({
      frameId: frame.id,
      gloss: "to reap",
      definition: "Cut grain or similar crops"
    })

    expect(sense.frameId).toBe(frame.id)

    const senseList = await service.listSensesByFrame(frame.id)
    expect(senseList).toHaveLength(1)

    const updatedSense = await service.updateSense(sense.id, { definition: "Harvest (crop)" })
    expect(updatedSense?.definition).toBe("Harvest (crop)")

    const idiom = await service.createIdiom({
      frameId: frame.id,
      text: "bring in the sheaves",
      notes: "English Christian hymn reference"
    })

    expect(idiom.frameId).toBe(frame.id)

    const idioms = await service.listIdiomsByFrame(frame.id)
    expect(idioms).toHaveLength(1)

    const updatedIdiom = await service.updateIdiom(idiom.id, { notes: "Late 19th century hymn" })
    expect(updatedIdiom?.notes).toBe("Late 19th century hymn")

    const deletedSense = await service.deleteSense(sense.id)
    expect(deletedSense).toBe(true)

    const deletedIdiom = await service.deleteIdiom(idiom.id)
    expect(deletedIdiom).toBe(true)

    const deletedFrame = await service.deleteFrame(frame.id)
    expect(deletedFrame).toBe(true)

    expect(await service.getFrameById(frame.id)).toBeNull()

    unsubscribe()

    await dispose()

    expect(events).toHaveLength(9)
    expect(events.map(({ entity, action }) => `${entity}:${action}`)).toEqual([
      "frame:created",
      "frame:updated",
      "sense:created",
      "sense:updated",
      "idiom:created",
      "idiom:updated",
      "sense:deleted",
      "idiom:deleted",
      "frame:deleted"
    ])
    expect(events[0].data).toMatchObject({ name: "Harvesting" })
    expect(events[2].data).toMatchObject({ gloss: "to reap" })
    expect(events[4].data).toMatchObject({ textValue: "bring in the sheaves" })
  })
})
