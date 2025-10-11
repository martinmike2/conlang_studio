import { describe, it, expect } from 'vitest'
import { createMockDoc } from '../../../apps/web/lib/ui/CollabProvider'

describe('createMockDoc', () => {
  it('update and subscribe', () => {
    const doc = createMockDoc('test-room')
    let seen: any = null
    const unsub = doc.subscribe((s: any) => {
      seen = s
    })
    doc.update({ text: 'hello' })
    expect(seen).toEqual({ text: 'hello' })
    unsub()
  })

  it('maintains state across multiple updates', () => {
    const doc = createMockDoc('test-room-2')
    const updates: any[] = []
    const unsub = doc.subscribe((s: any) => updates.push(s))
    
    doc.update({ text: 'first' })
    doc.update({ text: 'second' })
    doc.update({ text: 'third' })
    
    expect(updates).toHaveLength(3)
    expect(updates[2]).toEqual({ text: 'third' })
    expect(doc.state).toEqual({ text: 'third' })
    
    unsub()
  })

  it('supports multiple subscribers', () => {
    const doc = createMockDoc('test-room-3')
    const seen1: any[] = []
    const seen2: any[] = []
    
    const unsub1 = doc.subscribe((s: any) => seen1.push(s))
    const unsub2 = doc.subscribe((s: any) => seen2.push(s))
    
    doc.update({ text: 'broadcast' })
    
    expect(seen1).toHaveLength(1)
    expect(seen2).toHaveLength(1)
    expect(seen1[0]).toEqual({ text: 'broadcast' })
    expect(seen2[0]).toEqual({ text: 'broadcast' })
    
    unsub1()
    unsub2()
  })

  it('unsubscribe stops receiving updates', () => {
    const doc = createMockDoc('test-room-4')
    const seen: any[] = []
    
    const unsub = doc.subscribe((s: any) => seen.push(s))
    doc.update({ text: 'before' })
    
    unsub()
    
    doc.update({ text: 'after' })
    
    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual({ text: 'before' })
  })
})

// Note: React hook testing requires @testing-library/react
// For now, we test the core mock doc functionality above
// E2E tests in packages/testkits/e2e/collab.spec.ts will test the full integration