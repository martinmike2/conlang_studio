import { NextResponse } from "next/server"
import { diachronyService } from "@core/diachrony"
import { z } from "zod"

const evolutionBatchSchema = z.object({
  languageId: z.number().int().positive(),
  rules: z.array(z.object({
    id: z.string(),
    type: z.enum(["sound-change", "lexical-replacement", "semantic-shift", "innovation"]),
    description: z.string(),
    enabled: z.boolean(),
    meta: z.record(z.unknown()).optional()
  })),
  targetLexemes: z.array(z.number().int()).optional(),
  dryRun: z.boolean(),
  actor: z.string().optional(),
  seed: z.number().optional()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = evolutionBatchSchema.parse(body)

    const result = await diachronyService.executeEvolutionBatch(input)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Failed to execute evolution batch:", error)
    return NextResponse.json(
      { error: "Failed to execute evolution batch" },
      { status: 500 }
    )
  }
}
