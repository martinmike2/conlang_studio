import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runFullRecompute } from '../../../packages/core/morphology/recomputeWorker'

async function main() {
  const outDir = join(process.cwd(), 'benchmarks', 'phase4')
  try { mkdirSync(outDir, { recursive: true }) } catch (e) {}

  // configurations to test
  const configs = [
    { name: 'copy', useCopy: true, useUnnest: false, useMultiInsert: false, concurrency: 1 },
    { name: 'unnest_conc4', useCopy: false, useUnnest: true, useMultiInsert: false, concurrency: 4 },
    { name: 'unnest_conc1', useCopy: false, useUnnest: true, useMultiInsert: false, concurrency: 1 },
    { name: 'multi', useCopy: false, useUnnest: false, useMultiInsert: true, concurrency: 1 },
    { name: 'drizzle', useCopy: false, useUnnest: false, useMultiInsert: false, concurrency: 1 }
  ]

  const batchSizes = [250, 500, 1000]

  const results: any[] = []

  for (const cfg of configs) {
    for (const batchSize of batchSizes) {
      console.log('Running', cfg.name, 'batchSize', batchSize, 'concurrency', cfg.concurrency)
      const start = Date.now()
      const res = await runFullRecompute(batchSize, cfg.useMultiInsert, cfg.useUnnest, cfg.concurrency, cfg.useCopy)
      const duration = Date.now() - start
      console.log('Result', cfg.name, batchSize, JSON.stringify(res.timings))
      results.push({ config: cfg.name, batchSize, concurrency: cfg.concurrency, res })
      // write intermediate results so partial data isn't lost
      const outPath = join(outDir, 'persistence-compare.json')
      writeFileSync(outPath, JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2), { encoding: 'utf8' })
    }
  }

  const outPath = join(outDir, 'persistence-compare.json')
  writeFileSync(outPath, JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2), { encoding: 'utf8' })
  console.log('Wrote results to', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
