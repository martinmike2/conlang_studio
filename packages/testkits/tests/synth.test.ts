import { generateSynthetic } from "../synth/generator"

test("synthetic generator sizes", () => {
    const out = generateSynthetic({ phonemeCount: 5, lexemeCount: 3})
    expect(out.phonemes).toHaveLength(5)
    expect(out.lexemes).toHaveLength(3)
})