"use client"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slugify } from '../utils/slug'
import { normalizeFrameRoles, type FrameRoleInput, type FrameRole } from '@core/semantics/roles'
export type { FrameRoleInput, FrameRole } from '@core/semantics/roles'

type FetchFn = typeof fetch
type GlobalFetch = { fetch?: FetchFn }
const _fetch = (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
  const g = globalThis as unknown as GlobalFetch
  const fn = g.fetch ?? (globalThis as unknown as GlobalFetch).fetch
  return (fn as FetchFn)(...args)
}
export interface Frame {
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
  roles?: FrameRoleInput[]
}

interface UpdateFrameInput {
  id: number
  name?: string
  domain?: string | null
  description?: string | null
  roles?: FrameRoleInput[]
}

async function fetchFrames(): Promise<Frame[]> {
  const res = await _fetch('/api/frames', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load frames')
  const json = await res.json()
  const raw = json.data as Array<Partial<Frame> & { roles?: FrameRoleInput[] }>
  return raw.map((f) => ({
    id: f.id!,
    name: f.name!,
    slug: f.slug!,
    domain: f.domain ?? null,
    description: f.description ?? null,
    createdAt: f.createdAt!,
    roles: normalizeFrameRoles(f.roles)
  })) as Frame[]
}

async function createFrame(input: CreateFrameInput) {
  const { name, domain, description, roles } = input
  const payload = {
    name,
    domain,
    description,
    roles: normalizeFrameRoles(roles)
  }
  const res = await _fetch('/api/frames', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  const f = json.data
  return {
    ...f,
    roles: normalizeFrameRoles(f.roles as FrameRoleInput[] | undefined)
  } as Frame
}

async function updateFrame(input: UpdateFrameInput) {
  const { id, ...rest } = input
  const payload = {
    ...rest,
  roles: normalizeFrameRoles(rest.roles)
  }
  const res = await _fetch(`/api/frames?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  const f = json.data as Frame
  return {
    ...f,
    roles: normalizeFrameRoles(f.roles as FrameRoleInput[] | undefined)
  }
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
        roles: normalizeFrameRoles(input.roles)
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
      qc.setQueryData<Frame[]>(['frames'], (old = []) => old.map(f => {
        if (f.id !== input.id) return f
  const nextRoles = input.roles === undefined ? f.roles : normalizeFrameRoles(input.roles)
        return {
          ...f,
          ...input,
          slug: input.name ? slugify(input.name) : f.slug,
          roles: nextRoles
        }
      }))
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
