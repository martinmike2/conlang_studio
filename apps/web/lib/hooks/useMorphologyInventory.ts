"use client"
import { useQuery } from '@tanstack/react-query'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _fetch = (...args: any[]) => (globalThis as any).fetch(...args)

export interface RootOption {
  id: number
  representation: string
  gloss: string | null
  createdAt: string
}

export interface PatternOption {
  id: number
  name: string
  skeleton: string
  slotCount: number
  createdAt: string
}

export interface MorphologyInventory {
  roots: RootOption[]
  patterns: PatternOption[]
}

async function fetchInventory(): Promise<MorphologyInventory> {
  const res = await _fetch('/api/morphology/inventory', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load morphology inventory')
  const json = await res.json()
  const data = json.data as MorphologyInventory | undefined
  if (!data) return { roots: [], patterns: [] }
  return {
    roots: data.roots?.map((root) => ({
      ...root,
      gloss: root.gloss ?? null
    })) ?? [],
    patterns: data.patterns?.map((pattern) => ({
      ...pattern
    })) ?? []
  }
}

export function useMorphologyInventory() {
  return useQuery({ queryKey: ['morphology', 'inventory'], queryFn: fetchInventory })
}
