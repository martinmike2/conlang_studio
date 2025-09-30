import { logger } from "../logger"
import type { RootRecord, PatternRecord, RootPatternBindingRecord } from "./types"

export type MorphologyEventAction = "created" | "updated" | "deleted"
export type MorphologyEntity = "root" | "pattern" | "binding"

export interface MorphologyEventPayloadMap {
  root: RootRecord
  pattern: PatternRecord
  binding: RootPatternBindingRecord
}

export type MorphologyEvent<E extends MorphologyEntity = MorphologyEntity> = {
  entity: E
  action: MorphologyEventAction
  data: MorphologyEventPayloadMap[E]
  timestamp?: string
}

export type MorphologyEventWithTimestamp<E extends MorphologyEntity = MorphologyEntity> = MorphologyEvent<E> & {
  timestamp: string
}

type Subscriber = (event: MorphologyEventWithTimestamp) => void

const subscribers = new Set<Subscriber>()

export function subscribeMorphologyEvents(fn: Subscriber): () => void {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function emitMorphologyEvent(event: MorphologyEvent) {
  const enriched: MorphologyEventWithTimestamp = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString()
  }
  logger.info({ evt: "morphology", ...enriched }, "morphology event")
  for (const subscriber of subscribers) {
    subscriber(enriched)
  }
}

export function clearMorphologyEventSubscribers() {
  subscribers.clear()
}
