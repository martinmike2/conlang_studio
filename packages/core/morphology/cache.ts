import type { MorphologyEvent, MorphologyEventPayloadMap, MorphologyEntity } from "./events"

export type MorphologyCacheKey =
  | "morphology:roots:list"
  | "morphology:patterns:list"
  | "morphology:bindings:list"
  | `morphology:root:${number}`
  | `morphology:pattern:${number}`
  | `morphology:binding:${number}`
  | `morphology:bindings:root:${number}`
  | `morphology:bindings:pattern:${number}`
  | `morphology:paradigm:root:${number}`
  | `morphology:paradigm:pattern:${number}`

export type MorphologyCacheInvalidationMatrix = {
  readonly [K in MorphologyEntity]: (payload: MorphologyEventPayloadMap[K]) => MorphologyCacheKey[]
}

export const morphologyCacheInvalidationMatrix: MorphologyCacheInvalidationMatrix = Object.freeze({
  root: (root) => [
    "morphology:roots:list",
    `morphology:root:${root.id}`,
    "morphology:bindings:list",
    `morphology:bindings:root:${root.id}`,
    `morphology:paradigm:root:${root.id}`
  ],
  pattern: (pattern) => [
    "morphology:patterns:list",
    `morphology:pattern:${pattern.id}`,
    "morphology:bindings:list",
    `morphology:bindings:pattern:${pattern.id}`,
    `morphology:paradigm:pattern:${pattern.id}`
  ],
  binding: (binding) => [
    "morphology:bindings:list",
    `morphology:binding:${binding.id}`,
    `morphology:bindings:root:${binding.rootId}`,
    `morphology:bindings:pattern:${binding.patternId}`,
    `morphology:paradigm:root:${binding.rootId}`,
    `morphology:paradigm:pattern:${binding.patternId}`,
    `morphology:root:${binding.rootId}`,
    `morphology:pattern:${binding.patternId}`
  ]
})

function dedupe(keys: MorphologyCacheKey[]): MorphologyCacheKey[] {
  return [...new Set(keys)]
}

export function collectMorphologyCacheInvalidations<E extends MorphologyEntity>(
  event: MorphologyEvent<E>
): MorphologyCacheKey[] {
  const compute = morphologyCacheInvalidationMatrix[event.entity] as (
    payload: MorphologyEventPayloadMap[E]
  ) => MorphologyCacheKey[]
  return dedupe(compute(event.data))
}

export function collectMorphologyCacheInvalidationsFromEvents(
  events: readonly MorphologyEvent[]
): MorphologyCacheKey[] {
  const agg = new Set<MorphologyCacheKey>()
  for (const event of events) {
    const keys = collectMorphologyCacheInvalidations(event)
    for (const key of keys) {
      agg.add(key)
    }
  }
  return [...agg]
}
