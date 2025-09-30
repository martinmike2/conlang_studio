"use client"

import { useEffect, useMemo, useState } from 'react'

export interface SemanticsEvent {
  entity: 'frame' | 'sense' | 'idiom'
  action: 'created' | 'updated' | 'deleted'
  timestamp: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
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
        const parsed: SemanticsEvent = JSON.parse(event.data)
        setEvents((prev) => {
          const next = [parsed, ...prev]
          return next.slice(0, limit)
        })
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
