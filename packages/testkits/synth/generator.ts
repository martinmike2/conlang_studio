export interface SynthConfig {
    phonemeCount: number
    lexemeCount: number
}

export interface SynthOutput {
    phonemes: string[]
    lexemes: { lemma: string }[]
}

export function generateSynthetic(cfg: SynthConfig): SynthOutput {
    const phonemes = Array.from({ length: cfg.phonemeCount }, (_, i) => `p${i + 1}`)
    const lexemes = Array.from({ length: cfg.lexemeCount }, (_, i) => ({ lemma: `lex${i + 1}` }))
    return { phonemes, lexemes }
}