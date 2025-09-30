import { logger } from "../logger"
import type { SemanticFrameRecord, LexemeSenseRecord, IdiomRecord } from "./types"

export type SemanticEventAction = "created" | "updated" | "deleted"
export type SemanticEntity = "frame" | "sense" | "idiom"

export interface SemanticEventPayloadMap {
  frame: SemanticFrameRecord
  sense: LexemeSenseRecord
  idiom: IdiomRecord
}

export type SemanticEvent<E extends SemanticEntity = SemanticEntity> = {
  entity: E
  action: SemanticEventAction
  data: SemanticEventPayloadMap[E]
  timestamp?: string
}

export type SemanticEventWithTimestamp<E extends SemanticEntity = SemanticEntity> = SemanticEvent<E> & {
  timestamp: string
}

type Subscriber = (event: SemanticEventWithTimestamp) => void

const subscribers = new Set<Subscriber>()

export function subscribeSemanticsEvents(fn: Subscriber): () => void {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function emitSemanticsEvent(event: SemanticEvent) {
  const enriched: SemanticEventWithTimestamp = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString()
  }
  logger.info({ evt: "semantics", ...enriched }, "semantics event")
  for (const subscriber of subscribers) {
    subscriber(enriched)
  }
}

export function clearSemanticsEventSubscribers() {
  subscribers.clear()
}
