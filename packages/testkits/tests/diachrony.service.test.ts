import { describe, it, expect } from "vitest"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

import { createDiachronyTestHarness } from "./utils/diachronyTestUtils"
import { activityLog, languages, semanticFrames, lexemeSenses } from "../../db/schema/core"

async function setup() {
  const harness = await createDiachronyTestHarness()
  const { db, service } = harness

  const [language] = await db
    .insert(languages)
    .values({ name: "Proto-L", slug: `proto-${randomUUID()}` })
    .returning()

  const [frame] = await db
    .insert(semanticFrames)
    .values({ name: "Harvest", slug: `harvest-${randomUUID()}`, roles: [] })
    .returning()

  const [sense] = await db
    .insert(lexemeSenses)
    .values({ frameId: frame.id, gloss: "to gather" })
    .returning()

  return {
    ...harness,
    languageId: language.id,
    senseId: sense.id
  }
}

describe("diachrony service", () => {
  it("records lexical change entries and surfaces them via listing", async () => {
    const ctx = await setup()
    try {
      const created = await ctx.service.recordLexicalChange({
        languageId: ctx.languageId,
        changeType: "sound-shift",
        lexemeId: 42,
        note: "k→g between vowels",
        meta: { environment: "intervocalic" },
        actor: "system"
      })

      const listed = await ctx.service.listLexicalChanges({ languageId: ctx.languageId })
      expect(listed).toHaveLength(1)
      expect(listed[0]).toMatchObject({
        id: created.id,
        languageId: ctx.languageId,
        changeType: "sound-shift",
        lexemeId: 42,
        note: "k→g between vowels",
        meta: { environment: "intervocalic" }
      })

      const activityEntries = await ctx.db
        .select()
        .from(activityLog)
        .where(eq(activityLog.entity, "lexical-change"))

      expect(activityEntries).toHaveLength(1)
      expect(activityEntries[0]).toMatchObject({ scope: "diachrony", action: "sound-shift" })
    } finally {
      await ctx.dispose()
    }
  })

  it("records semantic shifts with trigger payload", async () => {
    const ctx = await setup()
    try {
      const created = await ctx.service.recordSemanticShift({
        languageId: ctx.languageId,
        senseId: ctx.senseId,
        shiftType: "broadening",
        note: "extended to ritual contexts",
        trigger: { corpus: "ritual songs", confidence: 0.82 },
        actor: "historian"
      })

      const listed = await ctx.service.listSemanticShifts({ languageId: ctx.languageId })
      expect(listed).toHaveLength(1)
      expect(listed[0]).toMatchObject({
        id: created.id,
        senseId: ctx.senseId,
        shiftType: "broadening",
        note: "extended to ritual contexts"
      })
      expect(listed[0].trigger).toEqual({ corpus: "ritual songs", confidence: 0.82 })

      const activityEntries = await ctx.db
        .select()
        .from(activityLog)
        .where(eq(activityLog.entity, "semantic-shift"))

      expect(activityEntries).toHaveLength(1)
      expect(activityEntries[0]).toMatchObject({ scope: "diachrony", action: "broadening" })
    } finally {
      await ctx.dispose()
    }
  })

  it("merges lexical and semantic events into a time-ordered timeline", async () => {
    const ctx = await setup()
    try {
      await ctx.service.recordLexicalChange({
        languageId: ctx.languageId,
        changeType: "analogical-leveling",
        occurredAt: new Date("2020-01-15T00:00:00.000Z")
      })
      await ctx.service.recordSemanticShift({
        languageId: ctx.languageId,
        senseId: ctx.senseId,
        shiftType: "narrowing",
        occurredAt: new Date("2020-03-20T00:00:00.000Z"),
        trigger: { source: "loan translations" }
      })

      const timeline = await ctx.service.getTimeline({ languageId: ctx.languageId, limit: 5 })
      expect(timeline.map(entry => entry.kind)).toEqual(["semantic-shift", "lexical-change"])
  expect(timeline[0].record.createdAt.toISOString()).toBe("2020-03-20T00:00:00.000Z")
  expect(timeline[1].record.createdAt.toISOString()).toBe("2020-01-15T00:00:00.000Z")
    } finally {
      await ctx.dispose()
    }
  })
})
