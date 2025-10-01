export type ReduplicationSpecVersion = 1

export type ReduplicationBaseSource = "stem" | "root"
export type ReduplicationPlacement = "prefix" | "suffix"

export interface ReduplicationFullCopySpec {
  mode: "full"
}

export interface ReduplicationPartialCopySpec {
  mode: "partial"
  segments: number
  scope: "initial" | "final"
}

export type ReduplicationCopySpec = ReduplicationFullCopySpec | ReduplicationPartialCopySpec

export interface ReduplicationAugmentSpec {
  prefix?: string[]
  suffix?: string[]
}

export interface ReduplicationTemplateSpecV1 {
  version: ReduplicationSpecVersion
  base: ReduplicationBaseSource
  placement: ReduplicationPlacement
  copy: ReduplicationCopySpec
  joiner?: string | null
  augment?: ReduplicationAugmentSpec
}

export type ReduplicationTemplateSpec = ReduplicationTemplateSpecV1

export interface ReduplicationTemplateValidationIssue {
  path: string
  message: string
}

export interface ReduplicationTemplateValidationSuccess {
  valid: true
  spec: ReduplicationTemplateSpec
}

export interface ReduplicationTemplateValidationFailure {
  valid: false
  issues: ReduplicationTemplateValidationIssue[]
}

export type ReduplicationTemplateValidationResult =
  | ReduplicationTemplateValidationSuccess
  | ReduplicationTemplateValidationFailure

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function coerceJoiner(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function validateAugment(value: unknown, issues: ReduplicationTemplateValidationIssue[], path: string): ReduplicationAugmentSpec | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== "object") {
    issues.push({ path, message: "augment must be an object when provided" })
    return undefined
  }

  const augment = value as Record<string, unknown>
  const result: ReduplicationAugmentSpec = {}

  if (augment.prefix !== undefined) {
    if (!Array.isArray(augment.prefix) || augment.prefix.length === 0) {
      issues.push({ path: `${path}.prefix`, message: "prefix must be a non-empty array of strings" })
    } else {
      const invalid = augment.prefix.find(segment => !isNonEmptyString(segment))
      if (invalid) {
        issues.push({ path: `${path}.prefix`, message: "prefix segments must be non-empty strings" })
      } else {
        result.prefix = augment.prefix.map(segment => (segment as string).trim())
      }
    }
  }

  if (augment.suffix !== undefined) {
    if (!Array.isArray(augment.suffix) || augment.suffix.length === 0) {
      issues.push({ path: `${path}.suffix`, message: "suffix must be a non-empty array of strings" })
    } else {
      const invalid = augment.suffix.find(segment => !isNonEmptyString(segment))
      if (invalid) {
        issues.push({ path: `${path}.suffix`, message: "suffix segments must be non-empty strings" })
      } else {
        result.suffix = augment.suffix.map(segment => (segment as string).trim())
      }
    }
  }

  if (!result.prefix && !result.suffix) {
    issues.push({ path, message: "augment must define at least one of prefix or suffix" })
  }

  return result
}

function validateCopySpec(value: unknown, issues: ReduplicationTemplateValidationIssue[], path: string): ReduplicationCopySpec | undefined {
  if (!value || typeof value !== "object") {
    issues.push({ path, message: "copy is required" })
    return undefined
  }

  const copy = value as Record<string, unknown>
  const mode = copy.mode
  if (mode !== "full" && mode !== "partial") {
    issues.push({ path: `${path}.mode`, message: "mode must be either \"full\" or \"partial\"" })
    return undefined
  }

  if (mode === "full") {
    return { mode }
  }

  const segments = copy.segments
  if (typeof segments !== "number" || !Number.isInteger(segments) || segments <= 0) {
    issues.push({ path: `${path}.segments`, message: "segments must be a positive integer for partial mode" })
  }

  const scope = copy.scope
  if (scope !== "initial" && scope !== "final") {
    issues.push({ path: `${path}.scope`, message: "scope must be \"initial\" or \"final\" for partial mode" })
  }

  if (issues.length > 0) {
    return undefined
  }

  return {
    mode,
    segments: segments as number,
    scope: scope as "initial" | "final"
  }
}

export function validateReduplicationTemplateSpec(input: unknown): ReduplicationTemplateValidationResult {
  const issues: ReduplicationTemplateValidationIssue[] = []

  if (!input || typeof input !== "object") {
    issues.push({ path: "spec", message: "spec must be an object" })
    return { valid: false, issues }
  }

  const spec = input as Record<string, unknown>

  if (spec.version !== 1) {
    issues.push({ path: "version", message: "version must be 1" })
  }

  const base = spec.base
  if (base !== "stem" && base !== "root") {
    issues.push({ path: "base", message: "base must be \"stem\" or \"root\"" })
  }

  const placement = spec.placement
  if (placement !== "prefix" && placement !== "suffix") {
    issues.push({ path: "placement", message: "placement must be \"prefix\" or \"suffix\"" })
  }

  const copy = validateCopySpec(spec.copy, issues, "copy")
  const joiner = coerceJoiner(spec.joiner)

  if (spec.joiner !== undefined && joiner === undefined) {
    issues.push({ path: "joiner", message: "joiner must be a string or null" })
  }

  const augment = validateAugment(spec.augment, issues, "augment")

  if (issues.length > 0 || !copy) {
    return { valid: false, issues }
  }

  const normalized: ReduplicationTemplateSpec = {
    version: 1,
    base: base as ReduplicationBaseSource,
    placement: placement as ReduplicationPlacement,
    copy,
    joiner,
    augment
  }

  return { valid: true, spec: normalized }
}

export function parseReduplicationTemplateSpec(json: string): ReduplicationTemplateValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    return {
      valid: false,
      issues: [{ path: "spec", message: err instanceof Error ? err.message : "Invalid JSON" }]
    }
  }

  return validateReduplicationTemplateSpec(parsed)
}

export function stringifyReduplicationTemplateSpec(spec: ReduplicationTemplateSpec): string {
  return JSON.stringify(spec)
}
