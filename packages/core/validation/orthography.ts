import { getDb, type DbClient } from "../../db/client"
import { orthographies, orthographySamples } from "../../db/schema/core"

export type ValidatorStatus = "pass" | "fail"

export interface OrthographyRoundTripIssue {
  orthographyId: number
  sampleId: number
  surface: string
  transliteration: string
  roundTrip: string
}

export interface OrthographyRoundTripResult {
  id: "orthography.roundTrip"
  name: string
  description: string
  status: ValidatorStatus
  summary: string
  orthographyCount: number
  sampleCount: number
  failures: OrthographyRoundTripIssue[]
}

function buildReverseMap(map: Record<string, string>): Record<string, string> {
  const reverse: Record<string, string> = {}
  for (const [source, target] of Object.entries(map)) {
    // If multiple source graphemes map to the same target, prefer the longest source
    const existing = reverse[target]
    if (!existing || source.length > existing.length) {
      reverse[target] = source
    }
  }
  return reverse
}

function applyGraphemeMap(input: string, map: Record<string, string>): string {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length)
  let result = ""
  let index = 0

  while (index < input.length) {
    let matched = false
    for (const key of keys) {
      if (key.length === 0) continue
      if (input.startsWith(key, index)) {
        result += map[key]
        index += key.length
        matched = true
        break
      }
    }
    if (!matched) {
      result += input[index]
      index += 1
    }
  }

  return result
}

export async function validateOrthographyRoundTrip(db: DbClient = getDb()): Promise<OrthographyRoundTripResult> {
  let orthographyRows: any[] = []
  let sampleRows: any[] = []
  try {
    orthographyRows = await db.select().from(orthographies)
    sampleRows = await db.select().from(orthographySamples)
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    if (msg.includes('does not exist') || msg.includes('no such table') || err?.code === '42P01') {
      return {
        id: 'orthography.roundTrip',
        name: 'Orthography round-trip',
        description: 'Ensures orthography samples convert to transliteration and back without loss.',
        status: 'fail',
        summary: 'Validation tables are missing; run migrations (e.g. 0003_validation_extensions.sql)',
        orthographyCount: 0,
        sampleCount: 0,
        failures: []
      }
    }
    throw err
  }

  const samplesByOrthography = new Map<number, typeof sampleRows>()
  for (const sample of sampleRows) {
    const list = samplesByOrthography.get(sample.orthographyId) ?? []
    list.push(sample)
    samplesByOrthography.set(sample.orthographyId, list)
  }

  const failures: OrthographyRoundTripIssue[] = []

  for (const ortho of orthographyRows) {
  const map = (ortho.graphemeMap as Record<string, string>) ?? {}
  const reverseMap = buildReverseMap(map)
    const samples = samplesByOrthography.get(ortho.id) ?? []

    for (const sample of samples) {
      const forward = applyGraphemeMap(sample.surface, map)
      const reversed = applyGraphemeMap(forward, reverseMap)
      const normalizedTransliteration = sample.transliteration
      if (reversed !== normalizedTransliteration) {
        failures.push({
          orthographyId: ortho.id,
          sampleId: sample.id,
          surface: sample.surface,
          transliteration: normalizedTransliteration,
          roundTrip: reversed
        })
      }
    }
  }

  const status: ValidatorStatus = failures.length === 0 ? "pass" : "fail"
  const name = "Orthography round-trip"
  const description = "Ensures orthography samples convert to transliteration and back without loss."
  const summary = status === "pass"
    ? "All orthography samples round-trip successfully."
    : `${failures.length} sample${failures.length === 1 ? "" : "s"} failed round-trip conversion.`

  return {
    id: "orthography.roundTrip",
    name,
    description,
    status,
    summary,
    orthographyCount: orthographyRows.length,
    sampleCount: sampleRows.length,
    failures
  }
}
