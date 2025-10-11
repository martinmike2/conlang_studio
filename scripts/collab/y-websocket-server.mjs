import http from 'http'
import process from 'process'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import { encoding, decoding } from 'lib0'
import jwt from 'jsonwebtoken'

// Store Y.js documents in memory per room
const docs = new Map()

function getYDoc(roomId) {
  let doc = docs.get(roomId)
  if (!doc) {
    doc = new Y.Doc()
    docs.set(roomId, doc)
  }
  return doc
}

const args = process.argv.slice(2)
const portIndex = args.findIndex(a => a === '--port')
let port = 1234
if (portIndex >= 0 && args[portIndex + 1]) port = Number(args[portIndex + 1])

// Simple in-memory metrics exported at /metrics as JSON
const metrics = {
  totalConnections: 0,
  rejected_missing_token: 0,
  rejected_invalid_token: 0,
  rejected_room_mismatch: 0,
  rejected_server_misconfigured: 0
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/metrics')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(metrics))
    return
  }
  res.writeHead(200)
  res.end('y-websocket server')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
  // Require and validate token query param for all connections
  try {
    const url = new URL(req.url, `http://localhost`)
    const pathname = url.pathname.replace(/^\/+/, '') // room id from path
    const token = url.searchParams.get('token')
    const secret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-nextauth-secret' : undefined)

    if (!token) {
      // token required
      console.warn('[collab] connection rejected: missing token')
      metrics.rejected_missing_token += 1
      conn.close(4002, 'token required')
      return
    }

    if (!secret) {
      console.warn('[collab] NEXTAUTH_SECRET not set; rejecting token-authenticated connection')
      metrics.rejected_server_misconfigured += 1
      conn.close(1011, 'server misconfigured')
      return
    }

    let payload
    try {
      payload = jwt.verify(token, secret)
      try { conn.auth = payload } catch (e) { /* ignore */ }
    } catch (err) {
      console.warn('[collab] invalid token on websocket connection', err?.message || err)
      metrics.rejected_invalid_token += 1
      conn.close(4001, 'invalid token')
      return
    }

    // Validate the token is scoped to the requested room (if the token contains a room claim)
    try {
      if (payload && typeof payload === 'object' && 'room' in payload) {
        const tokenRoom = String(payload.room || '')
        if (tokenRoom !== pathname) {
          console.warn('[collab] token room mismatch', { tokenRoom, requestedRoom: pathname })
          metrics.rejected_room_mismatch += 1
          conn.close(4003, 'room mismatch')
          return
        }
      }
    } catch (e) {
      // ignore validation failures beyond rejecting the connection
      conn.close(4003, 'room mismatch')
      return
    }

    // Setup Y.js sync for this connection
    const doc = getYDoc(pathname)
    metrics.totalConnections += 1
    
    // Setup message handler
    conn.on('message', (message) => {
      try {
        const decoder = decoding.createDecoder(new Uint8Array(message))
        const encoder = encoding.createEncoder()
        const messageType = decoding.readVarUint(decoder)
        
        switch (messageType) {
          case syncProtocol.messageYjsSyncStep1:
            encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep2)
            syncProtocol.writeSyncStep2(encoder, doc)
            conn.send(encoding.toUint8Array(encoder))
            break
          case syncProtocol.messageYjsSyncStep2:
            syncProtocol.readSyncStep2(decoder, doc, null)
            break
          case syncProtocol.messageYjsUpdate:
            syncProtocol.readUpdate(decoder, doc, null)
            break
        }
      } catch (err) {
        console.error('[collab] error handling message', err)
      }
    })
    
    // Send initial sync
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1)
    syncProtocol.writeSyncStep1(encoder, doc)
    conn.send(encoding.toUint8Array(encoder))
    
    // Broadcast updates to other clients
    const updateHandler = (update, origin) => {
      if (origin !== conn) {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, syncProtocol.messageYjsUpdate)
        encoding.writeVarUint8Array(encoder, update)
        conn.send(encoding.toUint8Array(encoder))
      }
    }
    doc.on('update', updateHandler)
    
    conn.on('close', () => {
      doc.off('update', updateHandler)
    })
  } catch (err) {
    console.error('[collab] error handling connection', err)
    try { conn.close(1011, 'server error') } catch (e) {}
  }
})

server.listen(port, () => {
  console.log(`y-websocket server running at ws://localhost:${port}`)
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
