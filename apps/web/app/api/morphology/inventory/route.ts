import { morphologyService } from '@core/morphology'
import { success } from '../../_util/respond'

function serializeDate(value: Date) {
  return value.toISOString()
}

export async function GET() {
  const [roots, patterns] = await Promise.all([
    morphologyService.listRoots(),
    morphologyService.listPatterns()
  ])

  return success({
    roots: roots.map(root => ({
      ...root,
      createdAt: serializeDate(root.createdAt)
    })),
    patterns: patterns.map(pattern => ({
      ...pattern,
      createdAt: serializeDate(pattern.createdAt)
    }))
  })
}
