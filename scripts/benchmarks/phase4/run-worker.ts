import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runFullRecompute } from '../../../packages/core/morphology/recomputeWorker'

async function main() {
  const outDir = join(process.cwd(), 'benchmarks', 'phase4')
  try { mkdirSync(outDir, { recursive: true }) } catch (e) {}

  console.log('Starting full recompute (this will read roots/patterns and persist bindings)')
  // options: batchSize=1000, useMultiInsert=true, useUnnest=true, concurrency=4, useCopy=true
  const useCopy = process.env.USE_COPY === '1' || process.argv.includes('--use-copy')
  const res = await runFullRecompute(1000, true, true, 4, useCopy)

  const outPath = join(outDir, 'worker-regeneration-baseline.json')
  writeFileSync(outPath, JSON.stringify({ createdAt: new Date().toISOString(), res }, null, 2), { encoding: 'utf8' })
  console.log(`Wrote baseline to ${outPath}`)
  console.log(JSON.stringify(res.timings))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
