import { describe, it, expect } from "vitest"
import * as schema from "../../db/schema/core"
import { createCoreTestDb } from "./utils/morphologyTestUtils"
import { createMorphologyService } from "@core/morphology"
import { createSemanticsService } from "@core/semantics"

// Full deterministic replay test: generates an abstract sequence of 250+ events
// (creates, updates, deletes across morphology & semantics), replays them
// against two fresh databases and asserts the canonical snapshot hash is equal.
// This is intentionally gated behind NIGHTLY to avoid long PR runs.

const isNightly = process.env.NIGHTLY === "1" || process.env.NIGHTLY === "true"

type Event =
  | { kind: "createRoot"; representation: string; gloss?: string | null }
  | { kind: "updateRoot"; index: number; representation?: string; gloss?: string | null }
  | { kind: "deleteRoot"; index: number }
  | { kind: "createPattern"; name: string; skeleton: string; slotCount: number }
  | { kind: "updatePattern"; index: number; name?: string; skeleton?: string; slotCount?: number }
  | { kind: "deletePattern"; index: number }
  | { kind: "createFrame"; name: string; slug: string; domain?: string | null; description?: string | null; roles?: any[] }
  | { kind: "updateFrame"; index: number; patch: Partial<{ name: string; slug: string; domain: string | null; description: string | null; roles: any[] }> }
  | { kind: "deleteFrame"; index: number }
  | { kind: "createSense"; frameIndex: number; gloss: string; definition?: string | null }
  | { kind: "updateSense"; index: number; patch: Partial<{ gloss: string; definition: string | null }> }
  | { kind: "deleteSense"; index: number }
  | { kind: "createIdiom"; frameIndex?: number | null; text: string; notes?: string | null }
  | { kind: "updateIdiom"; index: number; patch: Partial<{ text: string; notes: string | null }> }
  | { kind: "deleteIdiom"; index: number }

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function hexFraction(rng: () => number, length = 6) {
  let out = ""
  for (let i = 0; i < length; i++) {
    out += Math.floor(rng() * 16).toString(16)
  }
  return out
}

function generateAbstractEvents(seed: number, n = 300): Event[] {
  const rng = makeRng(seed)
  const events: Event[] = []

  let roots = 0
  let patterns = 0
  let frames = 0
  let senses = 0
  let idioms = 0

  for (let i = 0; i < n; i++) {
    const r = Math.floor(rng() * 100)

    if (r < 22) {
      // create root
      events.push({ kind: "createRoot", representation: `root-${i}-${hexFraction(rng)}`, gloss: rng() < 0.5 ? `gloss-${i}` : null })
      roots++
      continue
    }

    if (r < 42) {
      // create pattern
      events.push({ kind: "createPattern", name: `pat-${i}-${hexFraction(rng)}`, skeleton: `s${i}`, slotCount: 1 + Math.floor(rng() * 4) })
      patterns++
      continue
    }

    if (r < 62) {
      // create frame
      events.push({ kind: "createFrame", name: `frm-${i}-${hexFraction(rng)}`, slug: `frm-${i}`, domain: rng() < 0.5 ? `dom-${Math.floor(rng()*10)}` : null, description: rng() < 0.5 ? `desc-${i}` : null, roles: [{ name: `role-${i}`, core: rng() < 0.2 }] })
      frames++
      continue
    }

    if (r < 80 && frames > 0) {
      // create sense tied to a random existing frame index
      const frameIndex = Math.floor(rng() * frames)
      events.push({ kind: "createSense", frameIndex, gloss: `sense-${i}-${hexFraction(rng)}`, definition: rng() < 0.6 ? `def-${i}` : null })
      senses++
      continue
    }

    // updates or deletes, only when candidates exist
    if (r < 86 && roots > 0) {
      const index = Math.floor(rng() * roots)
      events.push({ kind: "updateRoot", index, representation: `root-up-${i}`, gloss: rng() < 0.5 ? `gup-${i}` : null })
      continue
    }

    if (r < 90 && patterns > 0) {
      const index = Math.floor(rng() * patterns)
      events.push({ kind: "updatePattern", index, name: `pat-up-${i}` })
      continue
    }

    if (r < 93 && frames > 0) {
      const index = Math.floor(rng() * frames)
      events.push({ kind: "updateFrame", index, patch: { description: `fupd-${i}` } })
      continue
    }

    if (r < 95 && senses > 0) {
      const index = Math.floor(rng() * senses)
      events.push({ kind: "updateSense", index, patch: { gloss: `supd-${i}` } })
      continue
    }

    if (r < 97 && idioms > 0) {
      const index = Math.floor(rng() * idioms)
      events.push({ kind: "updateIdiom", index, patch: { text: `iupd-${i}` } })
      continue
    }

    // occasional create idiom
    if (r < 99 && frames > 0) {
      const frameIndex = Math.floor(rng() * frames)
      events.push({ kind: "createIdiom", frameIndex, text: `idiom-${i}-${hexFraction(rng)}`, notes: rng() < 0.5 ? `note-${i}` : null })
      idioms++
      continue
    }

    // deletes - choose an entity to delete if available
    if (r >= 99) {
      // pick type to delete
      const pick = Math.floor(rng() * 4)
      if (pick === 0 && roots > 0) {
        const idx = Math.floor(rng() * roots)
        events.push({ kind: "deleteRoot", index: idx })
        roots--
      } else if (pick === 1 && patterns > 0) {
        const idx = Math.floor(rng() * patterns)
        events.push({ kind: "deletePattern", index: idx })
        patterns--
      } else if (pick === 2 && frames > 0) {
        const idx = Math.floor(rng() * frames)
        events.push({ kind: "deleteFrame", index: idx })
        frames--
      } else if (pick === 3 && senses > 0) {
        const idx = Math.floor(rng() * senses)
        events.push({ kind: "deleteSense", index: idx })
        senses--
      }
    }
  }

  return events
}

async function applyEventsToServices(events: Event[], db: any) {
  const morphology = createMorphologyService(db as any)
  const semantics = createSemanticsService(db as any)

  const rootIds: number[] = []
  const patternIds: number[] = []
  const frameIds: number[] = []
  const senseIds: number[] = []
  const idiomIds: number[] = []

  for (const ev of events) {
    try {
      switch (ev.kind) {
        case "createRoot": {
          const created = await morphology.createRoot({ representation: ev.representation, gloss: ev.gloss ?? null })
          rootIds.push(created.id)
          break
        }
        case "updateRoot": {
          const id = rootIds[ev.index]
          if (id !== undefined) await morphology.updateRoot(id, { representation: ev.representation, gloss: ev.gloss ?? undefined })
          break
        }
        case "deleteRoot": {
          const id = rootIds[ev.index]
          if (id !== undefined) {
            await morphology.deleteRoot(id)
            rootIds.splice(ev.index, 1)
          }
          break
        }
        case "createPattern": {
          const created = await morphology.createPattern({ name: ev.name, skeleton: ev.skeleton, slotCount: ev.slotCount })
          patternIds.push(created.id)
          break
        }
        case "updatePattern": {
          const id = patternIds[ev.index]
          if (id !== undefined) await morphology.updatePattern(id, { name: ev.name, skeleton: ev.skeleton, slotCount: ev.slotCount })
          break
        }
        case "deletePattern": {
          const id = patternIds[ev.index]
          if (id !== undefined) {
            await morphology.deletePattern(id)
            patternIds.splice(ev.index, 1)
          }
          break
        }
        case "createFrame": {
          const created = await semantics.createFrame({ name: ev.name, slug: ev.slug, domain: ev.domain ?? null, description: ev.description ?? null, roles: ev.roles ?? [] })
          frameIds.push(created.id)
          break
        }
        case "updateFrame": {
          const id = frameIds[ev.index]
          if (id !== undefined) await semantics.updateFrame(id, ev.patch)
          break
        }
        case "deleteFrame": {
          const id = frameIds[ev.index]
          if (id !== undefined) {
            await semantics.deleteFrame(id)
            frameIds.splice(ev.index, 1)
          }
          break
        }
        case "createSense": {
          const frameId = frameIds[ev.frameIndex]
          if (frameId !== undefined) {
            const created = await semantics.createSense({ frameId, gloss: ev.gloss, definition: ev.definition ?? null })
            senseIds.push(created.id)
          }
          break
        }
        case "updateSense": {
          const id = senseIds[ev.index]
          if (id !== undefined) await semantics.updateSense(id, ev.patch)
          break
        }
        case "deleteSense": {
          const id = senseIds[ev.index]
          if (id !== undefined) {
            await semantics.deleteSense(id)
            senseIds.splice(ev.index, 1)
          }
          break
        }
        case "createIdiom": {
          const frameId = ev.frameIndex === undefined || ev.frameIndex === null ? null : frameIds[ev.frameIndex]
          const created = await semantics.createIdiom({ frameId: frameId ?? undefined, text: ev.text, notes: ev.notes ?? null })
          idiomIds.push(created.id)
          break
        }
        case "updateIdiom": {
          const id = idiomIds[ev.index]
          if (id !== undefined) await semantics.updateIdiom(id, ev.patch)
          break
        }
        case "deleteIdiom": {
          const id = idiomIds[ev.index]
          if (id !== undefined) {
            await semantics.deleteIdiom(id)
            idiomIds.splice(ev.index, 1)
          }
          break
        }
        default:
          break
      }
    } catch (err) {
      // don't fail the whole replay on incidental service errors; log for visibility
      // (vitest environment doesn't have console grouping guarantees; keep simple)
      // eslint-disable-next-line no-console
      console.warn("replay event failed", err)
    }
  }
}

async function takeCanonicalSnapshot(db: any) {
  // Read chosen tables and produce a canonical JSON string excluding timestamps
  const pats = await db.select().from(schema.patterns)
  const roots = await db.select().from(schema.roots)
  const frames = await db.select().from(schema.semanticFrames)
  const senses = await db.select().from(schema.lexemeSenses)
  const idioms = await db.select().from(schema.idioms)

  const out = {
    patterns: pats.map((p: any) => ({ name: p.name, skeleton: p.skeleton, slotCount: p.slotCount } )).sort((a: any, b: any) => (a.name > b.name ? 1 : -1)),
    roots: roots.map((r: any) => ({ representation: r.representation, gloss: r.gloss })).sort((a: any, b: any) => (a.representation > b.representation ? 1 : -1)),
    frames: frames.map((f: any) => ({ name: f.name, slug: f.slug, domain: f.domain, description: f.description, roles: f.roles })).sort((a: any, b: any) => (a.slug > b.slug ? 1 : -1)),
    senses: senses.map((s: any) => ({ frameId: s.frameId, gloss: s.gloss, definition: s.definition })).sort((a: any, b: any) => (a.gloss > b.gloss ? 1 : -1)),
    idioms: idioms.map((m: any) => ({ frameId: m.frameId, textValue: m.textValue, notes: m.notes })).sort((a: any, b: any) => (a.textValue > b.textValue ? 1 : -1))
  }

  return JSON.stringify(out)
}

function snapshotHash(text: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16)
}

;(isNightly ? describe : describe.skip)("Replay determinism (nightly)", () => {
  it("replays 250+ mixed events deterministically across two fresh DBs", async () => {
    const seed = process.env.REPLAY_SEED ? Number(process.env.REPLAY_SEED) : 424242
    const events = generateAbstractEvents(seed, 320)

    // Run replay three times on fresh DBs and compare canonical snapshots
    const hashes: string[] = []
    for (let run = 0; run < 3; run++) {
      const { db, dispose } = await createCoreTestDb()
      try {
        await applyEventsToServices(events, db)
        const snap = await takeCanonicalSnapshot(db)
        hashes.push(snapshotHash(snap))
      } finally {
        await dispose()
      }
    }

    // all hashes should be identical across the three independent replays
    const unique = Array.from(new Set(hashes))
    expect(unique.length).toBe(1)
  }, 120000)
})
