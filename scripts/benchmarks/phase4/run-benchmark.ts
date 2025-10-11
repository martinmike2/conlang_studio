import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { generateSynthetic } from '../../../packages/testkits/synth/generator'
import { generateBinding } from '../../../packages/core/morphology/generator'
import { metrics } from '../../../packages/core/metrics'

interface BenchOptions {
  phonemes: number
  lexemes: number
  patternsPerLexeme: number
}

function makePatterns(n: number) {
  // simple patterns that exercise generateBinding: e.g., A1a, A1A2, A1aA2
  const base = ['A1a', 'A1A2', 'A1aA2', 'A1A2a', 'A1']
  const out: { id: number; skeleton: string }[] = []
  for (let i = 0; i < n; i++) {
    out.push({ id: i + 1, skeleton: base[i % base.length] })
  }
  return out
}

function makeRoots(n: number) {
  const out: { id: number; representation: string }[] = []
  for (let i = 0; i < n; i++) {
    out.push({ id: i + 1, representation: `r${i + 1}` })
  }
  return out
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0
  const idx = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[idx]
}

async function runBench(opts: BenchOptions) {
  const synth = generateSynthetic({ phonemeCount: opts.phonemes, lexemeCount: opts.lexemes })
  const patterns = makePatterns(opts.patternsPerLexeme)
  const roots = makeRoots(opts.lexemes)

  const timings: number[] = []

  const stopTotal = metrics.startSpan('bench.phase4.total')

  for (let i = 0; i < roots.length; i++) {
    const root = roots[i]
    const start = Date.now()
    for (const pattern of patterns) {
      // call generateBinding to simulate an inner loop of regeneration
      generateBinding({ id: root.id, representation: root.representation }, { id: pattern.id, skeleton: pattern.skeleton })
    }
    const dur = Date.now() - start
    timings.push(dur)
    metrics.histogram('bench.phase4.per_lexeme.ms').observe(dur)
  }

  const totalMs = stopTotal()

  timings.sort((a, b) => a - b)
  const p50 = percentile(timings, 50)
  const p95 = percentile(timings, 95)
  const p99 = percentile(timings, 99)

  const result = {
    createdAt: new Date().toISOString(),
    options: opts,
    totalMs,
    count: timings.length,
    p50,
    p95,
    p99,
    raw: timings
  }

  const outDir = join(process.cwd(), 'benchmarks', 'phase4')
  try { mkdirSync(outDir, { recursive: true }) } catch (e) {}
  const outPath = join(outDir, 'baseline.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2), { encoding: 'utf8' })
  console.log(`Wrote baseline to ${outPath}`)
  console.log(`p50=${p50}ms p95=${p95}ms p99=${p99}ms total=${totalMs}ms`) 
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts: BenchOptions = { phonemes: 10, lexemes: 1000, patternsPerLexeme: 5 }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--phonemes' || a === '-p') && args[i+1]) opts.phonemes = Number(args[++i])
    else if ((a === '--lexemes' || a === '-l') && args[i+1]) opts.lexemes = Number(args[++i])
    else if ((a === '--patterns' || a === '-n') && args[i+1]) opts.patternsPerLexeme = Number(args[++i])
  }
  return opts
}

// Run when executed directly via tsx/node
const opts = parseArgs()
runBench(opts).catch((err) => {
  console.error(err)
  process.exit(1)
})
