export type Phoneme = { symbol: string; features?: Record<string, any> }

// A tiny draft cluster complexity function.
// Input: array of clusters (each cluster is array of phoneme symbols or Phoneme objects)
// Output: a numeric score where higher is more complex.
export function clusterComplexity(clusters: Array<Array<string | Phoneme>>): number {
    if (!clusters || clusters.length === 0) return 0

    const obstruents = new Set([
        'p','b','t','d','k','g','c','ɟ','q','ʔ', // stops/affricates
        's','z','ʃ','ʒ','f','v','θ','ð','χ','ʁ' // fricatives
    ])

    // Very rough sonority scale (higher = more sonorous)
    const sonorityMap: Record<string, number> = {
        // vowels (approx)
        'a': 5, 'e': 5, 'i': 5, 'o': 5, 'u': 5,
        // approximants / vowels-like
        'j': 4, 'w': 4, 'l': 4, 'r': 4, 'ɾ': 4,
        // nasals
        'm': 3, 'n': 3, 'ŋ': 3,
        // fricatives (lower sonority)
        's': 2, 'z': 2, 'ʃ': 2, 'ʒ': 2, 'f': 2, 'v': 2,
        // stops (lowest sonority)
        'p': 1, 'b': 1, 't': 1, 'd': 1, 'k': 1, 'g': 1, 'ʔ': 1
    }

    function symbolOf(x: string | Phoneme) {
        return (typeof x === 'string' ? x : x.symbol).toLowerCase()
    }

    function sonorityOf(sym: string) {
        // Try single char lookups first, fallback to heuristic checks
        if (!sym) return 2
        const s = sym[0]
        return sonorityMap[s] ?? (obstruents.has(sym) ? 1 : 3)
    }

    const clusterScores: number[] = []

    for (const cl of clusters) {
        if (!cl || cl.length === 0) continue
        const syms = cl.map(symbolOf)
        const len = syms.length

        // length contribution (log scale)
        const lenScore = Math.log2(len + 1) * 1.6

        // distinct symbol contribution
        const distinct = new Set(syms)
        const distinctScore = distinct.size * 0.25

        // obstruent density
        let obsCount = 0
        for (const sym of syms) if (obstruents.has(sym)) obsCount++
        const obsDensity = obsCount / len
        const obsScore = obsDensity * 1.2

        // sonority variance (higher variance -> more marked cluster)
        const sonorityVals = syms.map(sonorityOf)
        const mean = sonorityVals.reduce((a,b)=>a+b,0) / sonorityVals.length
        const variance = sonorityVals.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / sonorityVals.length
        const sonorityScore = Math.sqrt(variance) * 0.9

        // small bonus if cluster contains only consonants (onset cluster complexity)
        const consonantOnly = syms.every(s => !'aeiou'.includes(s[0]))
        const consBonus = consonantOnly ? 0.3 : 0

        const clusterScore = lenScore + distinctScore + obsScore + sonorityScore + consBonus
        clusterScores.push(clusterScore)
    }

    // average cluster score
    const avg = clusterScores.reduce((a,b)=>a+b,0) / clusterScores.length

    // scale to a 0..100-ish range for readability
    const scaled = avg * 10
    return Number(scaled.toFixed(3))
}
