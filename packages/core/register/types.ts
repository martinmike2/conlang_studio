import { z } from "zod"

export const StylePolicyRuleSchema = z.object({
    id: z.string().min(1),
    description: z.string().optional(),
    forbidWords: z.array(z.string().min(1)).catch([] as string[]).transform((list) => list.map((item) => item.toLowerCase())),
    forbidPatterns: z.array(z.string().min(1)).catch([] as string[]),
    allowedRegisters: z.array(z.string().min(1)).catch([] as string[]),
    requireTags: z.array(z.string().min(1)).catch([] as string[]),
    maxSentenceLength: z.number().int().positive().optional(),
    minFormality: z.number().min(0).max(1).optional(),
    metadata: z.record(z.any()).optional()
}).transform((rule) => ({
    ...rule,
    forbidWords: rule.forbidWords ?? [],
    forbidPatterns: rule.forbidPatterns ?? [],
    allowedRegisters: rule.allowedRegisters ?? [],
    requireTags: rule.requireTags ?? []
}))

export type StylePolicyRule = z.infer<typeof StylePolicyRuleSchema>

export const StylePolicySchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string().nullish(),
    languageId: z.number().int().positive().nullish(),
    createdAt: z.coerce.date(),
    rules: z.array(StylePolicyRuleSchema).catch([] as Array<z.infer<typeof StylePolicyRuleSchema>>)
})

export type StylePolicy = z.infer<typeof StylePolicySchema>

export const StyleSampleSchema = z.object({
    id: z.string().min(1).optional(),
    text: z.string().min(1),
    register: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).catch([] as string[]),
    formality: z.number().min(0).max(1).optional()
}).transform((sample, ctx) => {
    const trimmedText = sample.text.trim()
    if (!trimmedText.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Sample text must contain more than whitespace"
        })
    }
    return {
        ...sample,
        id: sample.id?.trim() ?? undefined,
        text: trimmedText,
        tags: sample.tags ?? []
    }
})

export type StyleSample = z.infer<typeof StyleSampleSchema>

export type StylePolicyViolation = {
    sampleId: string
    sampleTextPreview: string
    ruleId: string
    reason: string
    detail?: string
}

export type StyleSampleEvaluation = {
    sampleId: string
    sampleTextPreview: string
    text: string
    register?: string
    tags: string[]
    violations: StylePolicyViolation[]
}

export type StylePolicyEvaluation = {
    policy: Pick<StylePolicy, "id" | "name"> & { ruleCount: number }
    samples: StyleSampleEvaluation[]
    summary: {
        evaluated: number
        passed: number
        failed: number
        violationCount: number
    }
}
