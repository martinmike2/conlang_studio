import { describe, it, expect } from 'vitest'
import { applyOverlay, explainConflict } from '@core/overlays'

describe('overlay engine', () => {
  it('adds new rule and sorts by priority', () => {
    const base = [
      { id: 1, pattern: 't', replacement: 'd', priority: 50 },
      { id: 2, pattern: 'k', replacement: 'g', priority: 10 }
    ]
    const ops = [
      { action: 'add', pattern: 'p', replacement: 'b', priority: 5 },
      { action: 'update', id: 1, priority: 1 }
    ]
    const out = applyOverlay(base as any, ops as any)
    expect(out.conflicts).toHaveLength(0)
    expect(out.applied.map((r) => r.id)).toEqual([1, 3, 2])
    expect(out.applied[0].priority).toBe(1)
  })

  it('applies update op', () => {
    const base = [{ id: 1, pattern: 't', replacement: 'd', priority: 10 }]
    const ops = [{ action: 'update', id: 1, replacement: "t'", priority: 5 }]
    const out = applyOverlay(base as any, ops as any)
    expect(out.applied).toHaveLength(1)
    expect(out.applied[0].replacement).toBe("t'")
    expect(out.conflicts).toHaveLength(0)
  })

  it('detects missing id for update', () => {
    const base = [{ id: 1, pattern: 't', replacement: 'd', priority: 10 }]
    const ops = [{ action: 'update' }]
    const out = applyOverlay(base as any, ops as any)
    expect(out.conflicts.length).toBeGreaterThan(0)
  })

  it('detects duplicate add at same priority and skips insert', () => {
    const base = [{ id: 1, pattern: 't', replacement: 'd', priority: 10 }]
    const ops = [{ action: 'add', pattern: 't', replacement: 'x', priority: 10 }]
    const out = applyOverlay(base as any, ops as any)
    expect(out.conflicts).toHaveLength(1)
    expect(out.applied).toHaveLength(1)
  })

  it('handles remove missing id conflict', () => {
    const base = [{ id: 1, pattern: 't', replacement: 'd', priority: 10 }]
    const ops = [{ action: 'remove', id: 99 }]
    const out = applyOverlay(base as any, ops as any)
    expect(out.conflicts).toHaveLength(1)
    expect(out.applied).toHaveLength(1)
  })

  it('supports large op arrays', () => {
    const base: any[] = []
    const ops = Array.from({ length: 500 }).map((_, i) => ({ action: 'add', pattern: `p${i}`, replacement: `r${i}`, priority: i }))
    const out = applyOverlay(base, ops as any)
    expect(out.applied).toHaveLength(500)
    expect(out.applied[0].pattern).toBe('p0')
    expect(out.conflicts).toHaveLength(0)
  })

  it('explainConflict formats message', () => {
    const result = applyOverlay([{ id: 1, pattern: 't', replacement: 'd', priority: 10 }] as any, [{ action: 'remove' } as any])
    expect(result.conflicts).toHaveLength(1)
    expect(explainConflict(result.conflicts[0])).toMatch(/Op #0/)
  })
})
