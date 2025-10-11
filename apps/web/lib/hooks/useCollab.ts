import { useContext } from 'react'
import { CollabContext, CollabAPI } from '../ui'

// re-export the provider API type for consumers
export type { CollabAPI }

export function useCollab() {
  const ctx = useContext(CollabContext)
  if (!ctx) throw new Error('useCollab must be used within a CollabProvider')
  return ctx
}

export default useCollab

// NOTE: This is a lightweight scaffold. The provider implements dynamic imports for Y.js
// and the websocket provider. It will attempt to use the env var NEXT_PUBLIC_COLLAB_WS_URL
// as the websocket backend; when that is missing or the dynamic import fails the provider
// returns a BroadcastChannel-backed mock doc suitable for local multi-window tests.
