"use client"

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SenseNetworkResult } from '@core/semantics'

const _fetch = (...args: any[]) => (globalThis as any).fetch(...args)

export interface UseSenseNetworkOptions {
  frameId?: number | null
  relationTypes?: string[]
  enabled?: boolean
}

async function fetchSenseNetwork(options: UseSenseNetworkOptions = {}): Promise<SenseNetworkResult> {
  const params = new URLSearchParams()
  if (options.frameId) {
    params.set('frameId', String(options.frameId))
  }
  if (options.relationTypes && options.relationTypes.length > 0) {
    for (const relationType of options.relationTypes) {
      params.append('relationType', relationType)
    }
  }

  const query = params.toString()
  const res = await _fetch(`/api/senses/network${query ? `?${query}` : ''}`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(await res.text())
  }
  const json = await res.json()
  return json.data as SenseNetworkResult
}

export function useSenseNetwork(options: UseSenseNetworkOptions = {}) {
  const normalizedRelationTypes = useMemo(() => {
    if (!options.relationTypes || options.relationTypes.length === 0) return undefined
    return [...options.relationTypes].sort()
  }, [options.relationTypes])

  return useQuery<SenseNetworkResult, Error>({
    queryKey: ['senseNetwork', { frameId: options.frameId ?? null, relationTypes: normalizedRelationTypes }],
    queryFn: () => fetchSenseNetwork({
      frameId: options.frameId ?? undefined,
      relationTypes: normalizedRelationTypes
    }),
    enabled: options.enabled !== false
  })
}
