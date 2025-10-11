import { applyAblautToSegment } from '../../../packages/core/morphology/ablaut'
import { validateReduplicationTemplateSpec } from '../../../packages/core/morphology/reduplication'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

function makeSegment(i: number) {
  const vowels = ['a','e','i','o','u']
  const cons = ['k','t','m','n','s','b','d','g','r','l']
  return `${cons[i % cons.length]}${vowels[(i*3) % vowels.length]}${cons[(i+2) % cons.length]}${vowels[(i*5)%vowels.length]}`
}

// Build a large ablaut mapping to force more work in lookup and string handling
function buildLargeSpec(size = 5000) {
  const mapping: Record<string,string> = {}
  for (let i = 0; i < size; i++) {
    const seg = makeSegment(i)
    // map to a pseudo-altered form
    mapping[seg] = seg.split('').reverse().join('') + (i % 2 === 0 ? 'a' : 'i')
  }
  const spec: any = {
    version: 1,
    inventory: ['a','e','i','o','u'],
    grades: [
      { label: 'base', mapping: mapping },
      { label: 'alt', mapping: Object.fromEntries(Object.entries(mapping).map(([k,v]) => [k, v + '_alt'])) }
    ]
  }
  return spec
}

function makeRedupSpec() {
  return {
    version: 1,
    base: 'root',
    placement: 'prefix',
    copy: { mode: 'partial', segments: 2, scope: 'initial' },
    augment: { prefix: ['x','y'], suffix: ['z'] }
  }
}

function reduplicateComplex(seg: string, spec: any) {
  // partial copy: copy first N characters where N = segments
  const n = spec.copy.segments || 1
  const copy = seg.slice(0, n)
  const joiner = spec.joiner ?? ''
  const prefix = (spec.augment?.prefix ?? []).join('')
  const suffix = (spec.augment?.suffix ?? []).join('')
  return prefix + copy + joiner + seg + suffix
}

async function runDeep(iterations = 300000, mapSize = 8000) {
  const spec = buildLargeSpec(mapSize)
  const redSpec = makeRedupSpec()
  const validation = validateReduplicationTemplateSpec(redSpec as any)
  if (!validation.valid) throw new Error('invalid redup spec')

  // prebuild list of segments
  const N = 2000
  const segments: string[] = []
  for (let i = 0; i < N; i++) segments.push(makeSegment(i))

  const timingsAblaut: number[] = []
  const timingsRedup: number[] = []

  for (let iter = 0; iter < iterations; iter++) {
    const s = segments[iter % N]
    const t0 = Date.now()
    const out = applyAblautToSegment(s, spec, 'alt', { fallback: 'original' })
    const t1 = Date.now()
    const r = reduplicateComplex(out ?? s, redSpec)
    const t2 = Date.now()
    timingsAblaut.push(t1 - t0)
    timingsRedup.push(t2 - t1)
    if (iter % 50000 === 0 && iter > 0) console.log('iter', iter)
  }

  // compute percentiles
  function pct(arr: number[], p: number) {
    const s = arr.slice().sort((a,b)=>a-b)
    if (s.length===0) return 0
    const idx = Math.floor((p/100)*(s.length-1))
    return s[idx]
  }

  const report = {
    iterations,
    mapSize,
    ablaut: { p50: pct(timingsAblaut,50), p95: pct(timingsAblaut,95), mean: timingsAblaut.reduce((a,b)=>a+b,0)/timingsAblaut.length },
    redup: { p50: pct(timingsRedup,50), p95: pct(timingsRedup,95), mean: timingsRedup.reduce((a,b)=>a+b,0)/timingsRedup.length }
  }

  const outPath = join(process.cwd(),'benchmarks','phase4','rewrite-deep.json')
  try { writeFileSync(outPath, JSON.stringify(report,null,2),'utf8') } catch(e){}
  console.log('wrote', outPath)
  console.log(report)
  return report
}

// Run unconditionally when executed as a script (tsx may present different module semantics)
if (process.argv[1] && process.argv[1].endsWith('rewrite-deep-profile.ts')) {
  const it = Number(process.argv[2] || '300000')
  const map = Number(process.argv[3] || '8000')
  runDeep(it, map).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
