/**
 * Y.js custom persistence provider that bridges to the collab_events API
 * 
 * This provider:
 * 1. Creates/joins a collaboration session via POST /api/collab/sessions
 * 2. Polls for new events via GET /api/collab/events
 * 3. Pushes local updates via POST /api/collab/events
 * 4. Integrates with Y.js document updates
 */

export interface CollabSession {
  id: number  // Database returns 'id', not 'sessionId'
  languageId?: number | null
  ownerId?: string | null
}

export interface CollabEvent {
  id: number
  sessionId: number
  actorId?: string | null
  clientSeq?: number | null
  serverSeq: number
  payload: Record<string, unknown> | null
  hash?: string | null
  createdAt: string
}

/**
 * Creates a persistence provider that syncs Y.js doc updates to the backend API
 */
export class ApiPersistenceProvider {
  private sessionId: number | null = null
  private lastServerSeq = 0
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private clientSeq = 0
  private actorId?: string
  private isDestroyed = false

  constructor(
    private doc: any, // Y.Doc
    private roomId: string,
    private options: { pollMs?: number; actorId?: string } = {}
  ) {
    this.actorId = options.actorId
    this.pollMs = options.pollMs || 1000
  }

  private pollMs: number

  /**
   * Initialize the provider: create or join session and start polling
   */
  async connect(): Promise<void> {
    if (this.isDestroyed) return

    try {
      // Create a new session (or should get existing by roomId - for now create)
      const createRes = await fetch('/api/collab/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Could pass languageId if available
          // Both fields are optional in the schema
        }),
        credentials: 'same-origin'
      })

      if (!createRes.ok) {
        const errorText = await createRes.text()
        console.error('[ApiPersistence] Failed to create session:', createRes.status, errorText)
        throw new Error(`Failed to create session: ${createRes.status} ${errorText}`)
      }

      const session: CollabSession = await createRes.json()
      this.sessionId = session.id  // Use 'id' field from database

      // Fetch initial events to sync state
      await this.fetchEvents()

      // Start polling for new events
      this.startPolling()

      // Listen to Y.js doc updates and push to API
      this.doc.on('update', this.handleDocUpdate)
    } catch (err) {
      console.error('[ApiPersistence] Connection error', err)
    }
  }

  /**
   * Fetch new events from the API and apply to Y.js doc
   */
  private async fetchEvents(): Promise<void> {
    if (this.isDestroyed || !this.sessionId) return

    try {
      const url = new URL('/api/collab/events', window.location.origin)
      url.searchParams.set('sessionId', String(this.sessionId))
      if (this.lastServerSeq > 0) {
        url.searchParams.set('sinceServerSeq', String(this.lastServerSeq))
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'same-origin'
      })

      if (!res.ok) {
        console.error('[ApiPersistence] Failed to fetch events', await res.text())
        return
      }

      const events: CollabEvent[] = await res.json()

      // Apply events to Y.js doc
      for (const event of events) {
        if (event.serverSeq > this.lastServerSeq) {
          this.lastServerSeq = event.serverSeq
          // Apply event payload to doc
          this.applyEventToDoc(event)
        }
      }
    } catch (err) {
      console.error('[ApiPersistence] Fetch events error', err)
    }
  }

  /**
   * Apply a collab event's payload to the Y.js document
   */
  private applyEventToDoc(event: CollabEvent): void {
    if (!event.payload) return

    try {
      // Decode the update from the payload
      // The payload should contain a base64-encoded Y.js update
      if (event.payload.update && typeof event.payload.update === 'string') {
        const Y = require('yjs')
        const updateBuffer = Buffer.from(event.payload.update, 'base64')
        Y.applyUpdate(this.doc, new Uint8Array(updateBuffer))
      }
    } catch (err) {
      console.error('[ApiPersistence] Failed to apply event to doc', err)
    }
  }

  /**
   * Handle Y.js document updates and push to API
   */
  private handleDocUpdate = async (update: Uint8Array, origin: any): Promise<void> => {
    // Don't push updates that originated from this provider
    if (origin === this || this.isDestroyed || !this.sessionId) return

    try {
      // Encode the update as base64 for transmission
      const updateB64 = Buffer.from(update).toString('base64')

      const res = await fetch('/api/collab/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          actorId: this.actorId,
          clientSeq: this.clientSeq++,
          payload: {
            update: updateB64
          }
        }),
        credentials: 'same-origin'
      })

      if (!res.ok) {
        console.error('[ApiPersistence] Failed to append event', await res.text())
      }
    } catch (err) {
      console.error('[ApiPersistence] Push update error', err)
    }
  }

  /**
   * Start polling for new events
   */
  private startPolling(): void {
    if (this.pollInterval) return

    this.pollInterval = setInterval(() => {
      void this.fetchEvents()
    }, this.pollMs)
  }

  /**
   * Stop polling and cleanup
   */
  disconnect(): void {
    this.isDestroyed = true

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    try {
      this.doc.off('update', this.handleDocUpdate)
    } catch (err) {
      // ignore
    }
  }

  destroy(): void {
    this.disconnect()
  }
}
