import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDb } from '../../../packages/db/client'
import { roots, patterns, rootPatternBindings } from '../../../packages/db/schema/core'
import { generateSynthetic } from '../../../packages/testkits/synth/generator'
import { generateBinding } from '../../../packages/core/morphology/generator'
import { metrics } from '../../../packages/core/metrics'

interface Options {
  phonemes: number
  lexemes: number
  patternsPerLexeme: number
  batchSize: number
  noDb: boolean
}

function makePatterns(n: number) {
  const base = ['A1a', 'A1A2', 'A1aA2', 'A1A2a', 'A1']
  const out: { name: string; skeleton: string; slotCount: number }[] = []
  for (let i = 0; i < n; i++) {
    const skeleton = base[i % base.length]
    const slotCount = (skeleton.match(/A1|A2/g) || []).length
    out.push({ name: `p${i + 1}`, skeleton, slotCount })
  }
  return out
}

function makeRoots(n: number) {
  const out: { representation: string }[] = []
  for (let i = 0; i < n; i++) {
    out.push({ representation: `r${i + 1}` })
  }
  return out
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0
  const idx = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[idx]
}

async function run(opts: Options) {
  const outDir = join(process.cwd(), 'benchmarks', 'phase4')
  try { mkdirSync(outDir, { recursive: true }) } catch (e) {}

  const synth = generateSynthetic({ phonemeCount: opts.phonemes, lexemeCount: opts.lexemes })

  // Prepare patterns/roots (either seed to DB or keep in-memory)
  const patternsToUse = makePatterns(opts.patternsPerLexeme)
  const rootsToUse = makeRoots(opts.lexemes)

  let db: any = null
  if (!opts.noDb) {
    try {
      db = getDb()
      // quick alive check
      await db.select().from(roots).limit(1)
    } catch (e) {
      console.error('DB connection failed, falling back to --no-db in-memory mode:', String(e))
      opts.noDb = true
      db = null
    }
  }

  if (db) {
    console.log('Seeding DB with synthetic roots/patterns...')
    // simple inserts (delete existing for clean run)
    try {
      await db.delete(rootPatternBindings).where(true as any)
    } catch (_) {}
    // insert roots
    const rootRows = rootsToUse.map((r) => ({ representation: r.representation }))
    await db.insert(roots).values(rootRows).returning()
    const patternRows = patternsToUse.map((p) => ({ name: p.name, skeleton: p.skeleton, slotCount: p.slotCount }))
    await db.insert(patterns).values(patternRows).returning()
  }

  // fetch phase timing
  const stopFetch = metrics.startSpan('paradigm.fetch')
  let dbRoots = rootsToUse
  let dbPatterns = patternsToUse

  if (db) {
    dbRoots = await db.select().from(roots).orderBy(roots.createdAt)
    dbPatterns = await db.select().from(patterns).orderBy(patterns.createdAt)
  }
  const fetchMs = stopFetch()

  // compute phase
  const stopCompute = metrics.startSpan('paradigm.compute')
  const computed: { rootId: number; patternId: number; generatedForm: string }[] = []

  // If DB provided, assume returned rows have numeric ids; otherwise synth ids will be 1-based index
  for (let i = 0; i < dbRoots.length; i++) {
    const root = dbRoots[i]
    for (let j = 0; j < dbPatterns.length; j++) {
      const pattern = dbPatterns[j]
      const rootId = (root as any).id ?? i + 1
      const patternId = (pattern as any).id ?? j + 1
      const binding = generateBinding({ id: rootId, representation: (root as any).representation }, { id: patternId, skeleton: (pattern as any).skeleton })
      computed.push({ rootId, patternId, generatedForm: binding.surfaceForm })
    }
  }
  const computeMs = stopCompute()

  // persist phase
  const stopPersist = metrics.startSpan('paradigm.persist')
  if (db) {
    const batchSize = Math.max(1, opts.batchSize)
    // Use UNNEST-based bulk inserts in parallel for better throughput
    const { getPool } = await import('../../../packages/db/client')
    const pool = getPool()
    const batches: any[][] = []
    for (let i = 0; i < computed.length; i += batchSize) batches.push(computed.slice(i, i + batchSize))
    const concurrency = 4
    if (batches.length <= 1 || concurrency <= 1) {
      for (const chunk of batches) {
        const rIds = chunk.map((c) => c.rootId)
        const pIds = chunk.map((c) => c.patternId)
        const forms = chunk.map((c) => c.generatedForm)
        const sql = `INSERT INTO root_pattern_bindings (root_id, pattern_id, generated_form) SELECT * FROM UNNEST($1::int[], $2::int[], $3::text[])`
        await pool.query(sql, [rIds, pIds, forms])
      }
    } else {
      let idx = 0
      const workers: Promise<void>[] = []
      for (let w = 0; w < concurrency; w++) {
        const worker = (async () => {
          while (true) {
            const myIdx = idx++
            if (myIdx >= batches.length) return
            const chunk = batches[myIdx]
            const rIds = chunk.map((c) => c.rootId)
            const pIds = chunk.map((c) => c.patternId)
            const forms = chunk.map((c) => c.generatedForm)
            const sql = `INSERT INTO root_pattern_bindings (root_id, pattern_id, generated_form) SELECT * FROM UNNEST($1::int[], $2::int[], $3::text[])`
            await pool.query(sql, [rIds, pIds, forms])
          }
        })()
        workers.push(worker)
      }
      await Promise.all(workers)
    }
  }
  const persistMs = stopPersist()

  // Summarize
  const timings = computed.reduce<number[]>((acc, _, idx) => {
    // for readability: approximate per-root timing by dividing compute time by roots
    return acc
  }, [])

  const result = {
    createdAt: new Date().toISOString(),
    options: opts,
    counts: { roots: dbRoots.length, patterns: dbPatterns.length, bindings: computed.length },
    timings: { fetchMs, computeMs, persistMs },
    metricsSnapshot: metrics.snapshot()
  }

  const outPath = join(outDir, 'regeneration-baseline.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2), { encoding: 'utf8' })
  console.log(`Wrote baseline to ${outPath}`)
  console.log(`fetch=${fetchMs}ms compute=${computeMs}ms persist=${persistMs}ms total=${fetchMs + computeMs + persistMs}ms`)
}

function parseArgs(): Options {
  const args = process.argv.slice(2)
  const opts: Options = { phonemes: 10, lexemes: 100, patternsPerLexeme: 5, batchSize: 1000, noDb: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--phonemes' || a === '-p') && args[i + 1]) opts.phonemes = Number(args[++i])
    else if ((a === '--lexemes' || a === '-l') && args[i + 1]) opts.lexemes = Number(args[++i])
    else if ((a === '--patterns' || a === '-n') && args[i + 1]) opts.patternsPerLexeme = Number(args[++i])
    else if ((a === '--batchSize' || a === '-b') && args[i + 1]) opts.batchSize = Number(args[++i])
    else if (a === '--no-db') opts.noDb = true
  }
  return opts
}

const opts = parseArgs()
run(opts).catch((err) => {
  console.error(err)
  process.exit(1)
})
