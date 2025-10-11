import { metrics } from "@core/metrics"
import { getDb, getPool } from "@db/client"
// pg-copy-streams used for COPY FROM STDIN path
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { roots, patterns, rootPatternBindings } from "@db/schema/core"
import { generateBinding } from "./generator"
import { collectMorphologyCacheInvalidationsFromEvents } from "./cache"
import { subscribeMorphologyEvents } from "./events"
import type { MorphologyEvent } from "./events"

function parseInvalidationKeys(keys: string[]) {
  const rootIds = new Set<number>()
  const patternIds = new Set<number>()
  for (const k of keys) {
    // examples: morphology:paradigm:root:123, morphology:paradigm:pattern:45, morphology:binding:12
    const m = k.match(/morphology:(?:paradigm:)?(root|pattern|binding):?(\d+)?/)
    if (!m) continue
    const kind = m[1]
    const id = m[2] ? Number(m[2]) : null
    if (kind === 'root' && id) rootIds.add(id)
    if (kind === 'pattern' && id) patternIds.add(id)
    if (kind === 'binding' && id) {
      // binding key doesn't include root/pattern ids; skip
    }
  }
  return { rootIds: [...rootIds], patternIds: [...patternIds] }
}

/**
 * Simple recompute worker: can run a full recompute (all roots×patterns)
 * or subscribe to events and recompute affected roots/patterns.
 */
// Tuned defaults from Phase4 sweep: UNNEST with moderate batch size and concurrency
const COPY_FALLBACK_THRESHOLD = 2000 // if a batch exceeds this, prefer COPY for throughput
export async function runFullRecompute(batchSize = 500, useMultiInsert = false, useUnnest = true, concurrency = 4, useCopy = false) {
  const db = getDb()
  const pool = getPool()
  const allRoots = await db.select().from(roots).orderBy(roots.id)
  const allPatterns = await db.select().from(patterns).orderBy(patterns.id)

  const stopFetch = metrics.startSpan('paradigm.fetch')
  const fetchMs = stopFetch()

  const stopCompute = metrics.startSpan('paradigm.compute')
  const computed: { rootId: number; patternId: number; generatedForm: string }[] = []
  for (let i = 0; i < allRoots.length; i++) {
    const r = allRoots[i]
    for (let j = 0; j < allPatterns.length; j++) {
      const p = allPatterns[j]
      const binding = generateBinding({ id: r.id, representation: r.representation }, { id: p.id, skeleton: p.skeleton })
      computed.push({ rootId: r.id, patternId: p.id, generatedForm: binding.surfaceForm })
    }
  }
  const computeMs = stopCompute()

  const stopPersist = metrics.startSpan('paradigm.persist')
  const batches: any[][] = []
  for (let i = 0; i < computed.length; i += batchSize) batches.push(computed.slice(i, i + batchSize))

  async function insertBatch(chunk: any[]) {
    // Decide whether to use COPY for this chunk: explicit flag or fallback when chunk is very large
    const effectiveUseCopy = useCopy || chunk.length >= COPY_FALLBACK_THRESHOLD
    if (effectiveUseCopy) {
      // Use COPY FROM STDIN with CSV stream for maximal throughput
      const client = await pool.connect()
      try {
        // build CSV rows in memory (note: could stream from generator to avoid high mem)
        const csvLines = chunk.map((c) => `${c.rootId},${c.patternId},"${String(c.generatedForm).replace(/"/g, '""')}"`).join('\n') + '\n'
        const copySql = 'COPY root_pattern_bindings (root_id, pattern_id, generated_form) FROM STDIN WITH (FORMAT csv)'
  const mod = await import('pg-copy-streams')
  const copyFrom = (mod as any).from ?? (mod as any).default?.from
  if (typeof copyFrom !== 'function') throw new Error('pg-copy-streams.from not available')
  const stream = client.query(copyFrom(copySql) as any)
        await pipeline(
          // convert string to readable stream
          Readable.from([csvLines]),
          stream
        )
      } finally {
        client.release()
      }
      return
    }
    if (!effectiveUseCopy && useUnnest) {
      // Use UNNEST-based bulk insert: single round-trip per batch
      const rIds = chunk.map((c) => c.rootId)
      const pIds = chunk.map((c) => c.patternId)
      const forms = chunk.map((c) => c.generatedForm)
      const sql = `INSERT INTO root_pattern_bindings (root_id, pattern_id, generated_form) SELECT * FROM UNNEST($1::int[], $2::int[], $3::text[])`
      await pool.query(sql, [rIds, pIds, forms])
    } else if (useMultiInsert) {
      const valuesSql: string[] = []
      const params: any[] = []
      let idx = 1
      for (const c of chunk) {
        valuesSql.push(`($${idx++},$${idx++},$${idx++})`)
        params.push(c.rootId, c.patternId, c.generatedForm)
      }
      const sql = `INSERT INTO root_pattern_bindings (root_id, pattern_id, generated_form) VALUES ${valuesSql.join(',')}`
      await pool.query(sql, params)
    } else {
      const vals = chunk.map((c) => ({ rootId: c.rootId, patternId: c.patternId, generatedForm: c.generatedForm }))
      await db.insert(rootPatternBindings).values(vals).returning()
    }
  }

  // Process batches with concurrency
  if (concurrency <= 1) {
    for (const b of batches) await insertBatch(b)
  } else {
    let idx = 0
    const workers: Promise<void>[] = []
    for (let w = 0; w < concurrency; w++) {
      const worker = (async () => {
        while (true) {
          const myIdx = idx++
          if (myIdx >= batches.length) return
          const b = batches[myIdx]
          await insertBatch(b)
        }
      })()
      workers.push(worker)
    }
    await Promise.all(workers)
  }
  const persistMs = stopPersist()

  return { counts: { roots: allRoots.length, patterns: allPatterns.length, bindings: computed.length }, timings: { fetchMs, computeMs, persistMs } }
}

// A naive event-driven subscription entrypoint — collects keys and logs; implement compaction later.
export function subscribeAndProcess(fn?: (e: MorphologyEvent) => Promise<void>) {
  // subscribe to events and forward to handler
  const unsubscribe = subscribeMorphologyEvents(async (e: MorphologyEvent) => {
    // compute invalidation keys
    const keys = collectMorphologyCacheInvalidationsFromEvents([e])
    const { rootIds, patternIds } = parseInvalidationKeys(keys)

    // If there are affected ids, compute & persist only those combos
    if (rootIds.length || patternIds.length) {
      // call internal handler to process event-driven recompute
      await processInvalidation({ rootIds, patternIds })
    }

    if (fn) await fn(e)
  })
  return unsubscribe
}

async function processInvalidation(opts: { rootIds: number[]; patternIds: number[] }) {
  const db = getDb()
  const pool = getPool()
  const { rootIds, patternIds } = opts

  // Determine the exact combos to recompute
  let targetRoots = [] as any[]
  let targetPatterns = [] as any[]

  if (rootIds.length > 0) {
    const allRoots = await db.select().from(roots).orderBy(roots.id)
    targetRoots = allRoots.filter((r) => rootIds.includes(r.id))
  }
  if (patternIds.length > 0) {
    const allPatterns = await db.select().from(patterns).orderBy(patterns.id)
    targetPatterns = allPatterns.filter((p) => patternIds.includes(p.id))
  }

  // If only roots provided, load all patterns; if only patterns provided, load all roots.
  if (rootIds.length > 0 && patternIds.length === 0) {
    targetPatterns = await db.select().from(patterns).orderBy(patterns.id)
  }
  if (patternIds.length > 0 && rootIds.length === 0) {
    targetRoots = await db.select().from(roots).orderBy(roots.id)
  }

  // Compute
  const stopCompute = metrics.startSpan('paradigm.compute')
  const computed: { rootId: number; patternId: number; generatedForm: string }[] = []
  for (const r of targetRoots) {
    for (const p of targetPatterns) {
      const binding = generateBinding({ id: r.id, representation: r.representation }, { id: p.id, skeleton: p.skeleton })
      computed.push({ rootId: r.id, patternId: p.id, generatedForm: binding.surfaceForm })
    }
  }
  const computeMs = stopCompute()

  // Persist: delete existing pairs for these roots×patterns, then insert new
  const stopPersist = metrics.startSpan('paradigm.persist')
  // delete matching pairs in a single statement per root/pattern set where possible
  try {
    if (targetRoots.length && targetPatterns.length) {
      const rIds = targetRoots.map((r) => r.id)
      const pIds = targetPatterns.map((p) => p.id)
      // delete where root_id IN (...) AND pattern_id IN (...)
      const delSql = `DELETE FROM root_pattern_bindings WHERE root_id = ANY($1) AND pattern_id = ANY($2)`
      await pool.query(delSql, [rIds, pIds])
    }
  } catch (e) {
    // fall back to per-pair deletes (best-effort)
    for (const c of computed) {
      try {
        await pool.query('DELETE FROM root_pattern_bindings WHERE root_id=$1 AND pattern_id=$2', [c.rootId, c.patternId])
      } catch (_) {}
    }
  }

  // Insert new values in manageable batches
  // Insert new values using UNNEST-based bulk insert with concurrency for best throughput
  const batchSize = 500
  const concurrency = 4
  const batches: any[][] = []
  for (let i = 0; i < computed.length; i += batchSize) batches.push(computed.slice(i, i + batchSize))

  async function insertChunk(chunk: any[]) {
    const rIds = chunk.map((c) => c.rootId)
    const pIds = chunk.map((c) => c.patternId)
    const forms = chunk.map((c) => c.generatedForm)
    const sql = `INSERT INTO root_pattern_bindings (root_id, pattern_id, generated_form) SELECT * FROM UNNEST($1::int[], $2::int[], $3::text[])`
    await pool.query(sql, [rIds, pIds, forms])
  }

  if (batches.length <= 1 || concurrency <= 1) {
    for (const b of batches) await insertChunk(b)
  } else {
    let idx = 0
    const workers: Promise<void>[] = []
    for (let w = 0; w < concurrency; w++) {
      const worker = (async () => {
        while (true) {
          const myIdx = idx++
          if (myIdx >= batches.length) return
          const b = batches[myIdx]
          await insertChunk(b)
        }
      })()
      workers.push(worker)
    }
    await Promise.all(workers)
  }
  const persistMs = stopPersist()

  return { counts: { roots: targetRoots.length, patterns: targetPatterns.length, bindings: computed.length }, timings: { computeMs, persistMs } }
}
