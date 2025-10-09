"use client"

import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

const _fetch = (input: RequestInfo, init?: RequestInit) => (globalThis as unknown as typeof fetch)(input, init)

export interface ActivityEntry {
  id: number
  occurredAt: string
  scope: string
  entity: string | null
  action: string
  summary: string
  actor: string | null
  frameId: number | null
  senseId: number | null
  idiomId: number | null
  payload: Record<string, unknown>
}

interface ActivityPage {
  entries: ActivityEntry[]
  nextCursor: number | null
}

interface UseActivityLogOptions {
  pageSize?: number
  scope?: string
}

async function fetchActivityPage(cursor: number | undefined, limit: number, scope?: string) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  if (cursor) params.set('cursor', String(cursor))
  if (scope) params.set('scope', scope)
  const res = await _fetch(`/api/activity?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  const data = json.data as ActivityPage
  return data
}

export function useActivityLog(options: UseActivityLogOptions = {}) {
  const pageSize = options.pageSize ?? 25
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  const query = useInfiniteQuery<ActivityPage, Error>({
    queryKey: ['activity', { scope: options.scope, pageSize }],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => fetchActivityPage(pageParam as number | undefined, pageSize, options.scope),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 15_000
  })

  useEffect(() => {
    const params = new URLSearchParams()
    if (options.scope) params.set('scope', options.scope)
    const source = new EventSource(`/api/activity/events${params.toString() ? `?${params.toString()}` : ''}`)

    source.onopen = () => setConnected(true)

    source.onmessage = (event) => {
      try {
        const entry: ActivityEntry = JSON.parse(event.data)
        queryClient.setQueryData(
          ['activity', { scope: options.scope, pageSize }],
          (previous: { pages: ActivityPage[]; pageParams: unknown[] } | undefined) => {
            if (!previous) {
              return {
                pages: [{ entries: [entry], nextCursor: null }],
                pageParams: [undefined]
              }
            }
            const [first, ...rest] = previous.pages
            const deduped = [entry, ...first.entries.filter((existing) => existing.id !== entry.id)]
            const trimmed = deduped.slice(0, pageSize)
            return {
              pages: [{ entries: trimmed, nextCursor: first.nextCursor }, ...rest],
              pageParams: previous.pageParams
            }
          }
        )
      } catch (err) {
        console.error('Failed to process activity event', err)
      }
    }

    source.onerror = () => {
      setConnected(false)
    }

    return () => {
      source.close()
    }
  }, [options.scope, pageSize, queryClient])

  const entries = useMemo(
    () => query.data?.pages.flatMap((page) => page.entries) ?? [],
    [query.data]
  )

  return {
    entries,
    connected,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error
  }
}
