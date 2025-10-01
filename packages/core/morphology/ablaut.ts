export type AblautSchemeVersion = 1

export interface AblautGradeDefinition {
  key: string
  label?: string
  description?: string
  aliases?: string[]
  mapping: Record<string, string>
}

export interface AblautSchemeSpecV1 {
  version: AblautSchemeVersion
  vowels: string[]
  defaultGrade: string
  grades: AblautGradeDefinition[]
}

export type AblautSchemeSpec = AblautSchemeSpecV1

export interface AblautSchemeValidationIssue {
  path: string
  message: string
}

export interface AblautSchemeValidationSuccess {
  valid: true
  spec: AblautSchemeSpec
}

export interface AblautSchemeValidationFailure {
  valid: false
  issues: AblautSchemeValidationIssue[]
}

export type AblautSchemeValidationResult =
  | AblautSchemeValidationSuccess
  | AblautSchemeValidationFailure

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeIdentifier(value: string): string {
  return value.trim()
}

function normalizeInventory(values: unknown, issues: AblautSchemeValidationIssue[], path: string): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    issues.push({ path, message: "vowels must be a non-empty array of strings" })
    return []
  }

  const normalized: string[] = []
  const seen = new Set<string>()

  for (let index = 0; index < values.length; index += 1) {
    const entry = values[index]
    if (!isNonEmptyString(entry)) {
      issues.push({ path: `${path}[${index}]`, message: "each vowel must be a non-empty string" })
      continue
    }
    const trimmed = entry.trim()
    if (seen.has(trimmed)) {
      issues.push({ path: `${path}[${index}]`, message: `duplicate vowel \"${trimmed}\"` })
      continue
    }
    seen.add(trimmed)
    normalized.push(trimmed)
  }

  if (normalized.length === 0) {
    issues.push({ path, message: "at least one vowel is required" })
  }

  return normalized
}

function normalizeAliases(
  value: unknown,
  issues: AblautSchemeValidationIssue[],
  path: string
): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    issues.push({ path, message: "aliases must be an array of strings" })
    return undefined
  }

  const normalized: string[] = []
  const seen = new Set<string>()

  value.forEach((entry, index) => {
    if (!isNonEmptyString(entry)) {
      issues.push({ path: `${path}[${index}]`, message: "alias must be a non-empty string" })
      return
    }
    const trimmed = entry.trim()
    if (seen.has(trimmed)) {
      issues.push({ path: `${path}[${index}]`, message: `duplicate alias \"${trimmed}\"` })
      return
    }
    seen.add(trimmed)
    normalized.push(trimmed)
  })

  return normalized.length > 0 ? normalized : undefined
}

function normalizeMapping(
  mapping: unknown,
  inventory: Set<string>,
  issues: AblautSchemeValidationIssue[],
  path: string
): Record<string, string> {
  if (!mapping || typeof mapping !== "object") {
    issues.push({ path, message: "mapping must be an object of source→target pairs" })
    return {}
  }

  const normalized: Record<string, string> = {}
  const entries = Object.entries(mapping as Record<string, unknown>)
  if (entries.length === 0) {
    issues.push({ path, message: "mapping must include at least one source vowel" })
    return {}
  }

  for (const [source, rawTarget] of entries) {
    const trimmedSource = source.trim()
    if (!inventory.has(trimmedSource)) {
      issues.push({ path: `${path}.${source}`, message: `source vowel \"${source}\" not in inventory` })
      continue
    }

    if (!isNonEmptyString(rawTarget)) {
      issues.push({ path: `${path}.${source}`, message: "target must be a non-empty string" })
      continue
    }

    normalized[trimmedSource] = rawTarget.trim()
  }

  if (Object.keys(normalized).length === 0) {
    issues.push({ path, message: "mapping must contain at least one valid source vowel" })
  }

  return normalized
}

function normalizeGrades(
  grades: unknown,
  inventory: Set<string>,
  issues: AblautSchemeValidationIssue[],
  path: string
): AblautGradeDefinition[] {
  if (!Array.isArray(grades) || grades.length === 0) {
    issues.push({ path, message: "grades must be a non-empty array" })
    return []
  }

  const normalized: AblautGradeDefinition[] = []
  const usedKeys = new Set<string>()
  const usedAliases = new Set<string>()

  grades.forEach((grade, index) => {
    if (!grade || typeof grade !== "object") {
      issues.push({ path: `${path}[${index}]`, message: "grade must be an object" })
      return
    }

    const data = grade as Record<string, unknown>
    if (!isNonEmptyString(data.key)) {
      issues.push({ path: `${path}[${index}].key`, message: "grade key must be a non-empty string" })
      return
    }

    const key = normalizeIdentifier(data.key)
    if (usedKeys.has(key)) {
      issues.push({ path: `${path}[${index}].key`, message: `duplicate grade key \"${key}\"` })
      return
    }
    usedKeys.add(key)

    const label = isNonEmptyString(data.label) ? data.label.trim() : undefined
    const description = isNonEmptyString(data.description) ? data.description.trim() : undefined

    const aliases = normalizeAliases(data.aliases, issues, `${path}[${index}].aliases`)
    if (aliases) {
      for (const alias of aliases) {
        if (usedKeys.has(alias) || usedAliases.has(alias)) {
          issues.push({ path: `${path}[${index}].aliases`, message: `alias \"${alias}\" conflicts with existing key or alias` })
          return
        }
        usedAliases.add(alias)
      }
    }

    const mapping = normalizeMapping(data.mapping, inventory, issues, `${path}[${index}].mapping`)
    if (Object.keys(mapping).length === 0) {
      return
    }

    normalized.push({ key, label, description, aliases, mapping })
  })

  return normalized
}

export function validateAblautSchemeSpec(input: unknown): AblautSchemeValidationResult {
  const issues: AblautSchemeValidationIssue[] = []

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      issues: [{ path: "spec", message: "spec must be an object" }]
    }
  }

  const spec = input as Record<string, unknown>

  if (spec.version !== 1) {
    issues.push({ path: "version", message: "version must be 1" })
  }

  const vowels = normalizeInventory(spec.vowels, issues, "vowels")
  const inventory = new Set(vowels)
  const grades = normalizeGrades(spec.grades, inventory, issues, "grades")

  const defaultGradeRaw = spec.defaultGrade
  if (!isNonEmptyString(defaultGradeRaw)) {
    issues.push({ path: "defaultGrade", message: "defaultGrade must be a non-empty string" })
  } else {
    const defaultGrade = defaultGradeRaw.trim()
    const keys = new Set(grades.flatMap((grade) => [grade.key, ...(grade.aliases ?? [])]))
    if (!keys.has(defaultGrade)) {
      issues.push({ path: "defaultGrade", message: `defaultGrade \"${defaultGrade}\" not found among grade keys or aliases` })
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues }
  }

  const normalized: AblautSchemeSpec = {
    version: 1,
    vowels,
    defaultGrade: (spec.defaultGrade as string).trim(),
    grades
  }

  return { valid: true, spec: normalized }
}

export function parseAblautSchemeSpec(json: string): AblautSchemeValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    return {
      valid: false,
      issues: [{ path: "spec", message: err instanceof Error ? err.message : "Invalid JSON" }]
    }
  }

  return validateAblautSchemeSpec(parsed)
}

export function stringifyAblautSchemeSpec(spec: AblautSchemeSpec): string {
  return JSON.stringify(spec)
}

export interface AblautSchemeDescriptor {
  id: string
  name: string
  description?: string
  spec: AblautSchemeSpec
}

export interface AblautRegistry {
  register(entry: AblautSchemeDescriptor): void
  upsert(entry: AblautSchemeDescriptor): void
  remove(id: string): boolean
  get(id: string): AblautSchemeDescriptor | undefined
  getByName(name: string): AblautSchemeDescriptor | undefined
  list(): AblautSchemeDescriptor[]
}

export function createAblautRegistry(initial: Iterable<AblautSchemeDescriptor> = []): AblautRegistry {
  const entries = new Map<string, AblautSchemeDescriptor>()
  const names = new Map<string, string>()

  function makeId(value: string): string {
    return value.trim()
  }

  function register(entry: AblautSchemeDescriptor, allowOverwrite: boolean) {
    const id = makeId(entry.id)
    if (!id) {
      throw new Error("scheme id must be a non-empty string")
    }
    const existing = entries.get(id)
    if (!allowOverwrite && existing) {
      throw new Error(`scheme with id \"${id}\" already exists`)
    }

    const payload: AblautSchemeDescriptor = {
      id,
      name: entry.name.trim(),
      description: entry.description?.trim() || undefined,
      spec: entry.spec
    }

    if (existing && existing.name.toLowerCase() !== payload.name.toLowerCase()) {
      names.delete(existing.name.toLowerCase())
    }

    const normalizedName = payload.name.toLowerCase()
    const existingIdForName = names.get(normalizedName)
    if (existingIdForName && existingIdForName !== id) {
      throw new Error(`scheme name \"${payload.name}\" already registered under id \"${existingIdForName}\"`)
    }

    entries.set(id, payload)
    names.set(normalizedName, id)
  }

  function remove(id: string): boolean {
    const key = makeId(id)
    if (!entries.has(key)) return false
    const existing = entries.get(key)
    if (existing) {
      const normalizedName = existing.name.toLowerCase()
      if (names.get(normalizedName) === key) {
        names.delete(normalizedName)
      }
    }
    return entries.delete(key)
  }

  function get(id: string): AblautSchemeDescriptor | undefined {
    return entries.get(makeId(id))
  }

  function getByName(name: string): AblautSchemeDescriptor | undefined {
    const id = names.get(name.trim().toLowerCase())
    return id ? entries.get(id) : undefined
  }

  function list(): AblautSchemeDescriptor[] {
    return Array.from(entries.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  function registerStrict(entry: AblautSchemeDescriptor) {
    register(entry, false)
  }

  function upsert(entry: AblautSchemeDescriptor) {
    register(entry, true)
  }

  for (const item of initial) {
    register(item, false)
  }

  return Object.freeze({
    register: registerStrict,
    upsert,
    remove,
    get,
    getByName,
    list
  })
}

export interface ApplyAblautOptions {
  fallback?: "original" | null | string
}

function resolveGradeFromLabel(spec: AblautSchemeSpec, label: string): AblautGradeDefinition | undefined {
  const normalized = label.trim()
  for (const grade of spec.grades) {
    if (grade.key === normalized) return grade
    if (grade.aliases && grade.aliases.includes(normalized)) return grade
  }
  return undefined
}

export function getAblautGrade(spec: AblautSchemeSpec, label: string): AblautGradeDefinition | undefined {
  return resolveGradeFromLabel(spec, label)
}

export function applyAblautToSegment(
  segment: string,
  spec: AblautSchemeSpec,
  gradeLabel: string,
  options: ApplyAblautOptions = {}
): string | null {
  const grade = resolveGradeFromLabel(spec, gradeLabel)
  if (!grade) {
    return options.fallback === "original" ? segment : options.fallback ?? null
  }

  const normalized = segment.trim()
  const replacement = grade.mapping[normalized]
  if (replacement !== undefined) {
    return replacement
  }

  if (options.fallback === "original") {
    return segment
  }

  if (typeof options.fallback === "string") {
    return options.fallback
  }

  return null
}
