import { describe, it, expect } from 'vitest'
import { clusterComplexity } from '../../core/metrics/clusterComplexity'

describe('clusterComplexity', () => {
    it('returns 0 for empty input', () => {
        expect(clusterComplexity([])).toBe(0)
    })

    it('scores simple clusters lower than complex ones', () => {
        const simple = [['p','a'], ['k','a']]
        const complex = [['s','t','r'], ['k','l','a','m']]
        const s = clusterComplexity(simple)
        const c = clusterComplexity(complex)
        expect(c).toBeGreaterThan(s)
    })

    it('handles mixed phoneme objects and strings', () => {
        const mixed = [[{ symbol: 's' }, 't', 'r']]
        expect(clusterComplexity(mixed)).toBeGreaterThan(0)
    })
})
