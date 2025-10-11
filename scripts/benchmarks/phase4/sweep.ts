import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runFullRecompute } from '../../../packages/core/morphology/recomputeWorker'

async function main() {
  const outDir = join(process.cwd(), 'benchmarks', 'phase4')
  try { mkdirSync(outDir, { recursive: true }) } catch (e) {}

  const batchSizes = [100, 250, 500, 1000]
  const concurrencies = [1, 2, 4, 8]
  const methods: { name: string; useMultiInsert: boolean; useUnnest: boolean; useCopy: boolean }[] = [
    { name: 'unnest', useMultiInsert: false, useUnnest: true, useCopy: false },
    { name: 'multiInsert', useMultiInsert: true, useUnnest: false, useCopy: false },
    { name: 'copy', useMultiInsert: false, useUnnest: false, useCopy: true }
  ]

  const results: any[] = []

  for (const method of methods) {
    for (const batchSize of batchSizes) {
      for (const concurrency of concurrencies) {
        const label = `${method.name}-batch${batchSize}-c${concurrency}`
        console.log('Running', label)
        try {
          const res = await runFullRecompute(batchSize, method.useMultiInsert, method.useUnnest, concurrency, method.useCopy)
          console.log('Result:', res.timings)
          results.push({ label, method: method.name, batchSize, concurrency, res })
          // persist intermediate results so long runs don't lose progress
          writeFileSync(join(outDir, 'sweep-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2), { encoding: 'utf8' })
        } catch (err) {
          console.error('Error for', label, err)
          results.push({ label, method: method.name, batchSize, concurrency, err: String(err) })
          writeFileSync(join(outDir, 'sweep-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2), { encoding: 'utf8' })
        }
      }
    }
  }

  writeFileSync(join(outDir, 'sweep-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2), { encoding: 'utf8' })
  console.log('Sweep complete; results written to benchmarks/phase4/sweep-results.json')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
