export interface BindingGeneratorOptions {
  stemFormatter?: (segments: string[]) => string
}

export interface GeneratedStemDefinition {
  slotIndex: number
  placeholder: string
}

export interface GeneratedBinding {
  rootId: number
  patternId: number
  surfaceForm: string
  segments: string[]
  definitions: GeneratedStemDefinition[]
}

export interface BindingRootInput {
  id: number
  representation: string
  gloss?: string | null
  createdAt?: Date
}

export interface BindingPatternInput {
  id: number
  skeleton: string
  slotCount?: number
  name?: string | null
  createdAt?: Date
}

const DEFAULT_VOWEL = "a"

function tokenizeSkeleton(skeleton: string): string[] {
  if (!skeleton) return []
  const tokens: string[] = []
  let i = 0
  while (i < skeleton.length) {
    const char = skeleton[i]
    if (char === "-" || /\s/.test(char)) {
      i += 1
      continue
    }
    if (/[A-Z]/.test(char)) {
      let j = i + 1
      while (j < skeleton.length && /\d/.test(skeleton[j])) {
        j += 1
      }
      tokens.push(skeleton.slice(i, j))
      i = j
    } else {
      tokens.push(char)
      i += 1
    }
  }
  return tokens
}

function isConsonantPlaceholder(token: string): boolean {
  return /^[A-Z](?:\d+)?$/.test(token)
}

function extractRootSegments(root: BindingRootInput): string[] {
  const normalized = root.representation.replace(/[^A-Za-z]/g, "").toLowerCase()
  return normalized.split("")
}

function resolvePlaceholder(
  token: string,
  rootSegments: string[],
  slotIndex: number
): { value: string; placeholder: string } {
  const match = token.match(/^([A-Z])(\d+)?$/)
  if (!match) {
    return { value: token, placeholder: token }
  }

  const [, base, indexSegment] = match
  const index = indexSegment ? Number.parseInt(indexSegment, 10) - 1 : slotIndex
  const rootIndex = Math.max(index, 0)
  let value = rootSegments[rootIndex]
  if (value === undefined) {
    value = rootSegments[rootSegments.length - 1] ?? DEFAULT_VOWEL
  }
  return { value, placeholder: token }
}

export function generateBinding(
  root: BindingRootInput,
  pattern: BindingPatternInput,
  options: BindingGeneratorOptions = {}
): GeneratedBinding {
  const rootSegments = extractRootSegments(root)
  const skeletonTokens = tokenizeSkeleton(pattern.skeleton ?? "")

  const segments: string[] = []
  const definitions: GeneratedStemDefinition[] = []

  let slotIndex = 0
  for (const token of skeletonTokens) {
    if (isConsonantPlaceholder(token)) {
      const resolved = resolvePlaceholder(token, rootSegments, slotIndex)
      segments.push(resolved.value)
      definitions.push({ slotIndex, placeholder: resolved.placeholder })
      slotIndex += 1
    } else {
      segments.push(token)
    }
  }

  const formatter = options.stemFormatter ?? ((parts: string[]) => parts.join(""))
  const surfaceForm = formatter(segments)

  return {
    rootId: root.id,
    patternId: pattern.id,
    surfaceForm,
    segments,
    definitions
  }
}
