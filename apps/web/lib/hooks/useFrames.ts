"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slugify } from '../utils/slug'

// Wrap global fetch to satisfy typecheck in environments where lib.dom types may be trimmed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _fetch = (...args: any[]) => (globalThis as any).fetch(...args)

interface FrameRole { name: string; cardinality: string }
interface Frame {
  id: number
  name: string
  slug: string
  domain: string | null
  description: string | null
  createdAt: string
  roles: FrameRole[]
}

interface CreateFrameInput {
  name: string
  domain?: string
  description?: string
  // Accept roles for forward compatibility; currently ignored by API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roles?: any[]
}

interface UpdateFrameInput {
  id: number
  name?: string
  domain?: string | null
  description?: string | null
}

async function fetchFrames(): Promise<Frame[]> {
  const res = await _fetch('/api/frames', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load frames')
  const json = await res.json()
  // API does not (yet) return roles; normalize with empty array
  return (json.data as unknown as Array<Partial<Frame> & { roles?: FrameRole[] }>).map(f => ({
    id: f.id!,
    name: f.name!,
    slug: f.slug!,
    domain: f.domain ?? null,
    description: f.description ?? null,
    createdAt: f.createdAt!,
    roles: f.roles ?? []
  })) as Frame[]
}

async function createFrame(input: CreateFrameInput) {
  const { name, domain, description } = input
  const res = await _fetch('/api/frames', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, domain, description })
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  const f = json.data
  return { ...f, roles: f.roles ?? [] } as Frame
}

async function updateFrame(input: UpdateFrameInput) {
  const { id, ...rest } = input
  const res = await _fetch(`/api/frames?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rest)
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.data as Frame
}

async function deleteFrame(id: number) {
  const res = await _fetch(`/api/frames?id=${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(await res.text())
  return id
}

export function useFrames() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['frames'], queryFn: fetchFrames })
  const createMutation = useMutation({
    mutationFn: (input: CreateFrameInput) => createFrame(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['frames'] })
      const previous = qc.getQueryData<Frame[]>(['frames'])
      const temp: Frame = {
        id: Date.now() * -1,
        name: input.name,
        slug: slugify(input.name),
        domain: input.domain ?? null,
        description: input.description ?? null,
        createdAt: new Date().toISOString(),
        roles: []
      }
      qc.setQueryData<Frame[]>(['frames'], (old = []) => [temp, ...old])
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['frames'], ctx.previous)
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['frames'] }) }
  })
  const updateMutation = useMutation({
    mutationFn: (input: UpdateFrameInput) => updateFrame(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['frames'] })
      const previous = qc.getQueryData<Frame[]>(['frames'])
      qc.setQueryData<Frame[]>(['frames'], (old = []) => old.map(f => f.id === input.id ? { ...f, ...input, slug: input.name ? slugify(input.name) : f.slug } : f))
      return { previous }
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(['frames'], ctx.previous) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['frames'] }) }
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFrame(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['frames'] })
      const previous = qc.getQueryData<Frame[]>(['frames'])
      qc.setQueryData<Frame[]>(['frames'], (old = []) => old.filter(f => f.id !== id))
      return { previous }
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(['frames'], ctx.previous) },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['frames'] }) }
  })
  // Expose full mutation object so callers can use create.mutate / create.isPending etc.
  return { ...query, create: createMutation, update: updateMutation, remove: deleteMutation }
}
