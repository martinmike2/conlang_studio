import { createDiachronyTestHarness } from "../packages/testkits/tests/utils/diachronyTestUtils"

async function main() {
  const thresholdMs = 5 * 60 * 1000 // 5 minutes

  console.log("Starting Phase 3 evolution validation (100 lexemes dry-run)")

  const harness = await createDiachronyTestHarness()
  const { db, service, dispose } = harness

  try {
    // Insert a test language so service calls have a languageId to work with
  const { languages } = await import("../packages/db/schema/core")
    const [lang] = await db.insert(languages).values({ name: "Validation Lang", slug: "validation-lang" }).returning()
    const languageId = lang.id

    // Prepare a target list of 100 mock lexeme IDs. The diachrony service's
    // internal fetchLexeme currently returns a mock for any lexeme id, so
    // providing IDs is sufficient to exercise the batch loop without a
    // full lexemes table implementation.
    const targetLexemes = Array.from({ length: 100 }, (_, i) => i + 1)

    const input: any = {
      languageId,
      rules: [
        { id: "rule-a-1", type: "sound-change", description: "a -> ɑ", enabled: true }
      ],
      dryRun: true,
      seed: 424242,
      targetLexemes
    }

    const start = Date.now()
    const result = await service.executeEvolutionBatch(input)
    const elapsed = Date.now() - start

    console.log("Evolution batch result summary:")
    console.log(`  rulesApplied: ${result.stats.rulesApplied}`)
    console.log(`  lexemesAffected: ${result.stats.lexemesAffected}`)
    console.log(`  changesProposed: ${result.stats.changesProposed}`)
    console.log(`  changesApplied: ${result.stats.changesApplied}`)
    console.log(`  warnings: ${result.warnings.length}`)
    if (result.warnings.length > 0) console.log("  sample warning:", result.warnings[0])

    console.log(`Elapsed: ${elapsed} ms`)

    if (elapsed <= thresholdMs) {
      console.log("Phase 3 evolution validation: PASS")
      process.exit(0)
    } else {
      console.error("Phase 3 evolution validation: FAIL - exceeded threshold of 5 minutes")
      process.exit(2)
    }
  } catch (err) {
    console.error("Phase 3 evolution validation: ERROR", err)
    process.exit(3)
  } finally {
    try { await dispose() } catch (e) { /* ignore */ }
  }
}

void main()
