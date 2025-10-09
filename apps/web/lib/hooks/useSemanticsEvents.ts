"use client"

import { useEffect, useMemo, useState } from 'react'

export interface SemanticsEvent {
  entity: 'frame' | 'sense' | 'idiom'
  action: 'created' | 'updated' | 'deleted'
  timestamp: string
  // event payload is untyped; treat as unknown and narrow at usage sites
  data: unknown
}

interface UseSemanticsEventsOptions {
  limit?: number
}

export function useSemanticsEvents(options: UseSemanticsEventsOptions = {}) {
  const { limit = 20 } = options
  const [events, setEvents] = useState<SemanticsEvent[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const source = new EventSource('/api/semantics/events')

    source.onopen = () => {
      setConnected(true)
    }

    source.onmessage = (event) => {
      try {
        const parsedRaw = JSON.parse(event.data)
        // Basic runtime validation: ensure required keys exist
        if (parsedRaw && typeof parsedRaw === 'object') {
          const asEvt = parsedRaw as SemanticsEvent
          if (asEvt.entity && asEvt.action && asEvt.timestamp) {
            setEvents((prev) => [asEvt, ...prev].slice(0, limit))
          }
        }
      } catch (err) {
        console.error('Failed to parse semantics event', err)
      }
    }

    source.onerror = () => {
      setConnected(false)
    }

    return () => {
      source.close()
    }
  }, [limit])

  const latest = useMemo(() => events[0] ?? null, [events])

  return { events, latest, connected }
}
