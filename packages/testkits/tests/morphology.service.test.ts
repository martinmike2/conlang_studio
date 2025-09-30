import { describe, it, expect, afterEach } from "vitest"

import { clearMorphologyEventSubscribers, subscribeMorphologyEvents, type MorphologyEventWithTimestamp } from "@core/morphology"
import { clearActivitySubscribers, listActivity } from "@core/activity"
import { createMorphologyTestHarness } from "./utils/morphologyTestUtils"

describe("MorphologyService", () => {
  afterEach(() => {
    clearMorphologyEventSubscribers()
    clearActivitySubscribers()
  })

  it("supports root and pattern CRUD", async () => {
    const { service, db, dispose } = await createMorphologyTestHarness()

    const events: MorphologyEventWithTimestamp[] = []
    const unsubscribe = subscribeMorphologyEvents((event) => {
      events.push(event)
    })

    const root = await service.createRoot({
      representation: "k-t-b",
      gloss: "to write"
    })

    expect(root.id).toBeGreaterThan(0)
    expect(root.gloss).toBe("to write")

    const roots = await service.listRoots()
    expect(roots).toHaveLength(1)
    expect(roots[0].representation).toBe("k-t-b")

    const updatedRoot = await service.updateRoot(root.id, { gloss: "write" })
    expect(updatedRoot?.gloss).toBe("write")

    const pattern = await service.createPattern({
      name: "CaCaC",
      skeleton: "C-a-C-a-C",
      slotCount: 3
    })

    expect(pattern.name).toBe("CaCaC")

    const patterns = await service.listPatterns()
    expect(patterns).toHaveLength(1)

    const updatedPattern = await service.updatePattern(pattern.id, { skeleton: "C-a-C-i-C" })
    expect(updatedPattern?.skeleton).toBe("C-a-C-i-C")

    const deletedPattern = await service.deletePattern(pattern.id)
    expect(deletedPattern).toBe(true)

    const deletedRoot = await service.deleteRoot(root.id)
    expect(deletedRoot).toBe(true)

    expect(await service.getRootById(root.id)).toBeNull()
    expect(await service.getPatternById(pattern.id)).toBeNull()

    unsubscribe()

    expect(events.map(({ entity, action }) => `${entity}:${action}`)).toEqual([
      "root:created",
      "root:updated",
      "pattern:created",
      "pattern:updated",
      "pattern:deleted",
      "root:deleted"
    ])

    const activity = await listActivity({ limit: 20 }, db as any)
    expect(activity.entries).toHaveLength(6)
    expect(activity.entries.every((entry) => entry.scope === "morphology")).toBe(true)
    expect(activity.entries[0].summary).toContain("Root")

    await dispose()
  })
})
