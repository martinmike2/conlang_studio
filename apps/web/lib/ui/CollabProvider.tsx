import React, { createContext, useMemo, useState, useCallback, useRef } from 'react'

export type CollabDoc = {
  state: Record<string, any>
  update: (s: any) => void
  subscribe: (cb: (s: any) => void) => () => void
  destroy?: () => void
}

export type CollabAPI = {
  presence: Array<{ id?: string; name?: string }>
  subscribe: (cb: (p: any[]) => void) => () => void
  getDoc: (roomId: string, opts?: { mock?: boolean; wsUrl?: string; usePersistence?: boolean }) => Promise<CollabDoc>
}

export const CollabContext = createContext<CollabAPI | null>(null)

// Exported for tests: create a simple mock doc that uses BroadcastChannel when available
export function createMockDoc(roomId: string) {
  const channelName = `conlang_collab_${roomId}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bc: any = typeof window !== 'undefined' && (window as any).BroadcastChannel ? new (window as any).BroadcastChannel(channelName) : null
  let state = { text: '' }
  const listeners: ((s: any) => void)[] = []
  if (bc) {
    bc.onmessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'doc:update') {
        state = ev.data.payload
        listeners.forEach((l) => l(state))
      }
    }
  }

  return {
    get state() {
      return state
    },
    update(newState: any) {
      state = newState
      listeners.forEach((l) => l(state))
      if (bc) bc.postMessage({ type: 'doc:update', payload: state })
    },
    subscribe(cb: (s: any) => void) {
      listeners.push(cb)
      return () => {
        const idx = listeners.indexOf(cb)
        if (idx >= 0) listeners.splice(idx, 1)
      }
    }
  }
}

export const CollabProvider = ({ children, enableMock }: { children: React.ReactNode; enableMock?: boolean }) => {
  // Lightweight state: presence list and a getDoc that either delegates to Y.js (dynamic) or a mock BroadcastChannel-driven doc
  const [presence, setPresence] = useState<any[]>([])

  // Helper: build a small adapter around a Y.Doc + provider so consumers get the same simple API as the mock
  async function createYjsAdapter(roomId: string, opts?: { wsUrl?: string; usePersistence?: boolean }) {
    try {
      const Y = await import('yjs')
      // dynamic import of websocket provider
      const yWebsocket = await import('y-websocket')

      // Default websocket URL: attempt to use NEXT_PUBLIC_COLLAB_WS_URL then fall back to localhost:1234 for dev
      const defaultUrl =
        (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_COLLAB_WS_URL as string)) ||
        'ws://localhost:1234'

      let wsUrl = opts?.wsUrl || defaultUrl

      // Try to fetch a short-lived auth token for the websocket handshake. The server
      // should validate the user's session and return a token scoped to the room.
      try {
        const tokRes = await fetch(`/api/collab/token?room=${encodeURIComponent(roomId)}`, { credentials: 'same-origin' })
        if (tokRes.ok) {
          const { token } = await tokRes.json()
          // append token as query param (server should validate it)
          wsUrl = `${wsUrl.replace(/\/$/, '')}?token=${encodeURIComponent(token)}`
        }
      } catch (e) {
        // ignore; fallback to unauthenticated connection if server doesn't expose token endpoint
      }

      const doc = new Y.Doc()
      
      // WebSocket provider for real-time sync between clients
      // @ts-ignore - dynamic import type
      const wsProvider = new yWebsocket.WebsocketProvider(wsUrl, roomId, doc)
      
      // Wait for initial sync to complete before proceeding (with timeout)
      await new Promise<void>((resolve) => {
        if (wsProvider.synced) {
          resolve()
        } else {
          const timeout = setTimeout(() => resolve(), 3000) // fallback after 3s
          wsProvider.on('synced', () => {
            clearTimeout(timeout)
            resolve()
          })
        }
      })
      
      // API persistence provider for backend persistence (if enabled)
      let apiProvider: any = null
      if (opts?.usePersistence !== false) {
        try {
          const { ApiPersistenceProvider } = await import('../collab/ApiPersistenceProvider')
          apiProvider = new ApiPersistenceProvider(doc, roomId, { pollMs: 2000 })
          await apiProvider.connect()
        } catch (e) {
          console.warn('[CollabProvider] API persistence not available', e)
        }
      }

      const ymap = doc.getMap('state')

      // Awareness / presence wiring: attempt to obtain current user info from a whoami endpoint
      try {
        const who = await fetch('/api/collab/whoami', { credentials: 'same-origin' })
        if (who.ok && wsProvider?.awareness) {
          const me = await who.json()
          try {
            wsProvider.awareness.setLocalStateField('user', { id: me.id, name: me.name })
          } catch (e) {
            // ignore
          }

          // subscribe to awareness changes and update local presence state
          const updatePresence = () => {
            try {
              const states = Array.from(wsProvider.awareness.getStates().values())
              // map to a simple presence array
              setPresence(states.map((s: any) => s.user).filter(Boolean))
            } catch (e) {
              // ignore
            }
          }
          wsProvider.awareness.on('update', updatePresence)
          // seed initial presence
          updatePresence()
        }
      } catch (e) {
        // ignore whoami failure
      }

      return {
        get state() {
          // return a shallow snapshot of the map as plain object
          try {
            return Object.fromEntries(ymap.entries())
          } catch (e) {
            return {}
          }
        },
        update(newState: any) {
          // set keys individually so updates are observable
          try {
            for (const k of Object.keys(newState || {})) {
              ymap.set(k, newState[k])
            }
          } catch (e) {
            // ignore
          }
        },
        subscribe(cb: (s: any) => void) {
          const handler = () => cb(Object.fromEntries(ymap.entries()))
          ymap.observe(handler)
          // call once with initial state
          cb(Object.fromEntries(ymap.entries()))
          return () => ymap.unobserve(handler)
        },
        destroy() {
          try {
            if (apiProvider) {
              apiProvider.destroy()
            }
          } catch (e) {
            // best effort
          }
          try {
            wsProvider.disconnect()
            wsProvider.destroy()
          } catch (e) {
            // best effort
          }
          try {
            doc.destroy()
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (err) {
      // dynamic import failed (package not installed) - caller should fall back to mock
      // console.info('Yjs dynamic import failed, falling back to mock', err)
      throw err
    }
  }

  // Simple mock implementation using BroadcastChannel for multi-context tests / dev
  // using exported createMockDoc

  const api: CollabAPI = useMemo(() => ({
    presence,
    subscribe: (cb: (p: any[]) => void) => {
      // NOTE: subscribe to presence updates
      const unsub = () => {}
      return unsub
    },
    getDoc: async (roomId: string, opts?: { mock?: boolean; wsUrl?: string; usePersistence?: boolean }) => {
      if (enableMock || (opts && opts.mock)) {
        return createMockDoc(roomId) as CollabDoc
      }

      // try to dynamically create a Yjs-backed adapter; if unavailable, gracefully return the mock
      try {
        return (await createYjsAdapter(roomId, { wsUrl: opts?.wsUrl, usePersistence: opts?.usePersistence })) as CollabDoc
      } catch (e) {
        // fallback to mock if Yjs isn't available at runtime
        return createMockDoc(roomId) as CollabDoc
      }
    }
  }), [presence, enableMock])

  return (
    <CollabContext.Provider value={api}>
      {children}
    </CollabContext.Provider>
  )
}

export default CollabProvider

// TODO:
// - Integrate Y.js here with awareness and websocket provider
// - Add presence/awareness handling and tidy up types
// - Add tests and a Playwright multi-browser smoke test
