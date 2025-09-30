import { describe, it, expect, afterEach } from "vitest"
import { subscribeSemanticsEvents, clearSemanticsEventSubscribers, type SemanticEventWithTimestamp } from "@core/semantics"
import { clearActivitySubscribers, listActivity } from "@core/activity"
import { createSemanticsTestHarness } from "./utils/semanticsTestUtils"

describe("SemanticsService", () => {
  afterEach(() => {
    clearSemanticsEventSubscribers()
    clearActivitySubscribers()
  })

  it("supports frame, sense, and idiom CRUD", async () => {
  const { service, db, dispose } = await createSemanticsTestHarness()
    const events: SemanticEventWithTimestamp[] = []
    const unsubscribe = subscribeSemanticsEvents((event) => {
      events.push(event)
    })

    const frame = await service.createFrame({
      name: "Harvesting",
      slug: "harvesting",
      domain: "agriculture",
      description: "Harvest-related frames",
      roles: [
        { name: "AGENT", cardinality: "1" },
        { name: "PATIENT", cardinality: "1" }
      ]
    })

    expect(frame.id).toBeGreaterThan(0)
    expect(frame.roles).toEqual([
      { name: "AGENT", cardinality: "1", order: 0 },
      { name: "PATIENT", cardinality: "1", order: 1 }
    ])

    const listed = await service.listFrames()
    expect(listed).toHaveLength(1)
    expect(listed[0].slug).toBe("harvesting")
    expect(listed[0].roles).toEqual([
      { name: "AGENT", cardinality: "1", order: 0 },
      { name: "PATIENT", cardinality: "1", order: 1 }
    ])

    const updatedFrame = await service.updateFrame(frame.id, {
      description: "Reaping and threshing",
      roles: [
        { name: "AGENT", cardinality: "1" },
        { name: "TOOL", cardinality: "0..n" }
      ]
    })
    expect(updatedFrame?.description).toBe("Reaping and threshing")
    expect(updatedFrame?.roles).toEqual([
      { name: "AGENT", cardinality: "1", order: 0 },
      { name: "TOOL", cardinality: "0..n", order: 1 }
    ])

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

    const activity = await listActivity({ limit: 20 }, db as any)
    expect(activity.entries).toHaveLength(9)
    expect(activity.entries.map(({ entity, action }) => `${entity}:${action}`)).toEqual(
      [...events.map(({ entity, action }) => `${entity}:${action}`)].reverse()
    )
    expect(activity.entries[0].summary).toContain("Frame “Harvesting” deleted")

    await dispose()
  })
})
