import { describe, it, expect } from "vitest"

import {
  collectMorphologyCacheInvalidations,
  collectMorphologyCacheInvalidationsFromEvents,
  type MorphologyEvent
} from "@core/morphology"

const NOW = new Date("2025-09-30T00:00:00.000Z")

describe("morphology cache invalidation matrix", () => {
  it("maps root events to root-centric cache buckets", () => {
    const event: MorphologyEvent<"root"> = {
      entity: "root",
      action: "updated",
      data: {
        id: 12,
        representation: "k-t-b",
        gloss: "write",
        createdAt: NOW
      }
    }

    const keys = collectMorphologyCacheInvalidations(event)
    const expected = [
      "morphology:roots:list",
      "morphology:bindings:list",
      "morphology:paradigm:root:12",
      "morphology:bindings:root:12",
      "morphology:root:12"
    ]

    expect(new Set(keys)).toEqual(new Set(expected))
    expect(keys.length).toBe(new Set(keys).size)
  })

  it("maps pattern events to pattern-centric cache buckets", () => {
    const event: MorphologyEvent<"pattern"> = {
      entity: "pattern",
      action: "deleted",
      data: {
        id: 8,
        name: "Form I",
        skeleton: "C-a-C-a-C",
        slotCount: 3,
        createdAt: NOW
      }
    }

    const keys = collectMorphologyCacheInvalidations(event)
    const expected = [
      "morphology:patterns:list",
      "morphology:bindings:list",
      "morphology:pattern:8",
      "morphology:bindings:pattern:8",
      "morphology:paradigm:pattern:8"
    ]

    expect(new Set(keys)).toEqual(new Set(expected))
    expect(keys.length).toBe(new Set(keys).size)
  })

  it("maps binding events to combined root and pattern buckets", () => {
    const event: MorphologyEvent<"binding"> = {
      entity: "binding",
      action: "created",
      data: {
        id: 42,
        rootId: 4,
        patternId: 8,
        generatedForm: "katab",
        createdAt: NOW
      }
    }

    const keys = collectMorphologyCacheInvalidations(event)
    const expected = [
      "morphology:bindings:list",
      "morphology:binding:42",
      "morphology:bindings:root:4",
      "morphology:bindings:pattern:8",
      "morphology:paradigm:root:4",
      "morphology:paradigm:pattern:8",
      "morphology:root:4",
      "morphology:pattern:8"
    ]

    expect(new Set(keys)).toEqual(new Set(expected))
    expect(keys.length).toBe(new Set(keys).size)
  })

  it("deduplicates keys across multiple events", () => {
    const events: MorphologyEvent[] = [
      {
        entity: "root",
        action: "updated",
        data: {
          id: 4,
          representation: "s-m",
          gloss: "to hear",
          createdAt: NOW
        }
      },
      {
        entity: "binding",
        action: "updated",
        data: {
          id: 99,
          rootId: 4,
          patternId: 8,
          generatedForm: "samam",
          createdAt: NOW
        }
      }
    ]

    const keys = collectMorphologyCacheInvalidationsFromEvents(events)
    const expected = [
      "morphology:roots:list",
      "morphology:bindings:list",
      "morphology:root:4",
      "morphology:bindings:root:4",
      "morphology:paradigm:root:4",
      "morphology:binding:99",
      "morphology:bindings:pattern:8",
      "morphology:paradigm:pattern:8",
      "morphology:pattern:8"
    ]

    expect(new Set(keys)).toEqual(new Set(expected))
    expect(keys.length).toBe(new Set(keys).size)
  })
})
