import { applyAblautToSegment } from '../../../packages/core/morphology/ablaut'
import { stringifyReduplicationTemplateSpec, parseReduplicationTemplateSpec } from '../../../packages/core/morphology/reduplication'

function makeRandomSegment(i: number) {
  const vowels = ['a','e','i','o','u']
  const cons = ['k','t','m','n','s','b','d','g']
  return `${cons[i % cons.length]}${vowels[i % vowels.length]}${cons[(i+1) % cons.length]}`
}

// small ablaut spec (mock)
const spec = {
  version: 1,
  inventory: ['a','i','u'],
  grades: [
    { label: '0', mapping: { 'a': 'a', 'i': 'i', 'u': 'u' } },
    { label: '1', mapping: { 'a': 'e', 'i': 'e', 'u': 'o' } }
  ]
}

const parsed = spec as any

// reduplication example spec
const redSpec = {
  version: 1,
  base: 'root',
  placement: 'prefix',
  copy: { mode: 'partial', segments: 1, scope: 'initial' }
}

// parse to ensure functions are exercised
parseReduplicationTemplateSpec(JSON.stringify(redSpec))

function reduplicate(segment: string) {
  // naive: copy first char
  return segment[0] + segment
}

export async function runProfile(iterations = 200000) {
  const n = 100
  const segments: string[] = []
  for (let i = 0; i < n; i++) segments.push(makeRandomSegment(i))

  let out = ''
  for (let iter = 0; iter < iterations; iter++) {
    const s = segments[iter % n]
    const r = applyAblautToSegment(s, parsed, '1', { fallback: 'original' })
    out = r ?? s
    out = reduplicate(out)
  }

  // return to avoid optimizations discarding work
  return out.length
}

if (typeof (import.meta as any).main !== 'undefined' ? (import.meta as any).main : false) {
  const it = Number(process.argv[2] || '200000')
  console.log('Running rewrite-profile iterations=', it)
  runProfile(it).then((len) => console.log('done', len)).catch((e) => { console.error(e); process.exit(1) })
}
