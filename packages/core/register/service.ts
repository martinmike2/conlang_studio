import { eq } from "drizzle-orm"
import { getDb } from "../../db/client"
import { stylePolicies } from "../../db/schema/core"
import { StylePolicySchema, StyleSampleSchema, type StylePolicy, type StylePolicyEvaluation, type StylePolicyViolation, type StyleSample } from "./types"

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const createPreview = (text: string, limit = 120) => {
    const trimmed = text.trim()
    if (trimmed.length <= limit) {
        return trimmed
    }
    return `${trimmed.slice(0, limit - 1)}…`
}

type DbClient = ReturnType<typeof getDb>

type StylePolicyRow = typeof stylePolicies.$inferSelect

type NormalisedSample = StyleSample & { id: string }

function coercePolicy(row: StylePolicyRow): StylePolicy {
    const normalisedRules = Array.isArray(row.rules) ? row.rules : []
    return StylePolicySchema.parse({ ...row, rules: normalisedRules })
}

function normaliseSample(sample: StyleSample & { id: string }): NormalisedSample {
    return {
        ...sample,
        id: sample.id,
        text: sample.text.trim(),
        register: sample.register?.trim() || undefined,
        tags: Array.from(new Set((sample.tags ?? []).map((tag) => tag.trim()).filter(Boolean)))
    }
}

function checkForbiddenWords(rule: StylePolicy["rules"][number], sample: NormalisedSample): StylePolicyViolation[] {
    const lower = sample.text.toLowerCase()
    return rule.forbidWords.flatMap((word) => {
        if (!word.length) {
            return []
        }
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i")
        if (regex.test(lower)) {
            return [{
                sampleId: sample.id,
                sampleTextPreview: createPreview(sample.text),
                ruleId: rule.id,
                reason: `Forbidden word “${word}” detected`,
                detail: `Rule forbids the word “${word}”.`
            } satisfies StylePolicyViolation]
        }
        return []
    })
}

function buildPattern(pattern: string) {
    try {
        return new RegExp(pattern, "i")
    } catch {
        return null
    }
}

function checkForbiddenPatterns(rule: StylePolicy["rules"][number], sample: NormalisedSample): StylePolicyViolation[] {
    return rule.forbidPatterns.flatMap((pattern) => {
        const compiled = buildPattern(pattern)
        if (!compiled) {
            return [{
                sampleId: sample.id,
                sampleTextPreview: createPreview(sample.text),
                ruleId: rule.id,
                reason: `Invalid pattern “${pattern}”`,
                detail: "The stored pattern could not be compiled to a regular expression."
            } satisfies StylePolicyViolation]
        }
        if (compiled.test(sample.text)) {
            return [{
                sampleId: sample.id,
                sampleTextPreview: createPreview(sample.text),
                ruleId: rule.id,
                reason: `Text matches forbidden pattern`,
                detail: `Pattern: ${pattern}`
            } satisfies StylePolicyViolation]
        }
        return []
    })
}

function checkAllowedRegisters(rule: StylePolicy["rules"][number], sample: NormalisedSample): StylePolicyViolation[] {
    if (!rule.allowedRegisters.length) {
        return []
    }
    if (!sample.register) {
        return [{
            sampleId: sample.id,
            sampleTextPreview: createPreview(sample.text),
            ruleId: rule.id,
            reason: "Register required",
            detail: `Rule limits register to: ${rule.allowedRegisters.join(", ")}`
        } satisfies StylePolicyViolation]
    }
    if (!rule.allowedRegisters.includes(sample.register)) {
        return [{
            sampleId: sample.id,
            sampleTextPreview: createPreview(sample.text),
            ruleId: rule.id,
            reason: `Register “${sample.register}” is not allowed`,
            detail: `Allowed registers: ${rule.allowedRegisters.join(", ")}`
        } satisfies StylePolicyViolation]
    }
    return []
}

function checkRequiredTags(rule: StylePolicy["rules"][number], sample: NormalisedSample): StylePolicyViolation[] {
    if (!rule.requireTags.length) {
        return []
    }
    const missing = rule.requireTags.filter((tag) => !sample.tags.includes(tag))
    if (!missing.length) {
        return []
    }
    return [{
    sampleId: sample.id,
        sampleTextPreview: createPreview(sample.text),
        ruleId: rule.id,
        reason: "Missing required tags",
        detail: `Required tags: ${rule.requireTags.join(",")}. Missing: ${missing.join(",")}`
    } satisfies StylePolicyViolation]
}

function checkMaxSentence(rule: StylePolicy["rules"][number], sample: NormalisedSample): StylePolicyViolation[] {
    if (!rule.maxSentenceLength) {
        return []
    }
    const words = sample.text.trim().split(/[\s\n]+/g).filter(Boolean)
    if (words.length <= rule.maxSentenceLength) {
        return []
    }
    return [{
        sampleId: sample.id,
        sampleTextPreview: createPreview(sample.text),
        ruleId: rule.id,
        reason: `Sentence length ${words.length} exceeds maximum of ${rule.maxSentenceLength}`
    } satisfies StylePolicyViolation]
}

function checkFormality(rule: StylePolicy["rules"][number], sample: NormalisedSample): StylePolicyViolation[] {
    if (rule.minFormality === undefined) {
        return []
    }
    if (sample.formality === undefined) {
        return [{
            sampleId: sample.id,
            sampleTextPreview: createPreview(sample.text),
            ruleId: rule.id,
            reason: `Formality score required (>= ${rule.minFormality})`
        } satisfies StylePolicyViolation]
    }
    if (sample.formality < rule.minFormality) {
        return [{
            sampleId: sample.id,
            sampleTextPreview: createPreview(sample.text),
            ruleId: rule.id,
            reason: `Formality score ${sample.formality.toFixed(2)} below minimum ${rule.minFormality}`
        } satisfies StylePolicyViolation]
    }
    return []
}

const checkers = [
    checkForbiddenWords,
    checkForbiddenPatterns,
    checkAllowedRegisters,
    checkRequiredTags,
    checkMaxSentence,
    checkFormality
]

export function evaluateStylePolicy(policy: StylePolicy, samples: StyleSample[]): StylePolicyEvaluation {
    const parsedSamples = samples.map((sample) => StyleSampleSchema.parse(sample))
    const normalisedSamples: NormalisedSample[] = parsedSamples.map((sample, index) => normaliseSample({
        ...sample,
        id: sample.id ?? `sample-${index + 1}`
    }))

    const evaluations = normalisedSamples.map((sample) => {
        const violations = policy.rules.flatMap((rule) => {
            return checkers.flatMap((checker) => checker(rule, sample))
        })
        return {
            sampleId: sample.id,
            sampleTextPreview: createPreview(sample.text),
            text: sample.text,
            register: sample.register,
            tags: sample.tags,
            violations
        }
    })

    const failed = evaluations.filter((evaluation) => evaluation.violations.length > 0)

    return {
        policy: {
            id: policy.id,
            name: policy.name,
            ruleCount: policy.rules.length
        },
        samples: evaluations,
        summary: {
            evaluated: evaluations.length,
            passed: evaluations.length - failed.length,
            failed: failed.length,
            violationCount: evaluations.reduce((sum, evaluation) => sum + evaluation.violations.length, 0)
        }
    }
}

export async function listStylePolicies(opts: { languageId?: number; db?: DbClient } = {}): Promise<StylePolicy[]> {
    const db = opts.db ?? getDb()
    const rows = await (opts.languageId !== undefined
        ? db.select().from(stylePolicies).where(eq(stylePolicies.languageId, opts.languageId)).orderBy(stylePolicies.createdAt)
        : db.select().from(stylePolicies).orderBy(stylePolicies.createdAt)
    )
    return rows.map(coercePolicy)
}

export async function getStylePolicyById(id: number, db: DbClient = getDb()): Promise<StylePolicy | null> {
    const [row] = await db.select().from(stylePolicies).where(eq(stylePolicies.id, id)).limit(1)
    if (!row) {
        return null
    }
    return coercePolicy(row)
}

export async function evaluatePolicyById(id: number, samples: StyleSample[], db: DbClient = getDb()): Promise<StylePolicyEvaluation | null> {
    const policy = await getStylePolicyById(id, db)
    if (!policy) {
        return null
    }
    return evaluateStylePolicy(policy, samples)
}
