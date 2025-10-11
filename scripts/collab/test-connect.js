#!/usr/bin/env node
// Small integration script: fetch a token from Next API and try connecting to collab websocket server
import WebSocket from 'ws'

// Prefer global fetch (Node 18+). Fall back to node-fetch only if necessary.
let fetchFn
try {
  // eslint-disable-next-line no-undef
  fetchFn = fetch // global
} catch (e) {
  // dynamic import so node-fetch is only required when needed
  fetchFn = (await import('node-fetch')).default
}

const NEXT_URL = process.env.NEXT_URL || 'http://localhost:3000'
const WS_URL_BASE = process.env.COLLAB_WS || 'ws://localhost:1234'
const ROOM = process.argv[2] || 'test-room'

async function main() {
  console.log('Requesting token for room', ROOM)
  const res = await fetchFn(`${NEXT_URL}/api/collab/token?room=${encodeURIComponent(ROOM)}`, { credentials: 'include' })
  if (!res.ok) {
    console.error('token endpoint returned', res.status)
    process.exit(2)
  }
  const { token } = await res.json()
  if (!token) {
    console.error('no token in response')
    process.exit(3)
  }

  const wsUrl = `${WS_URL_BASE.replace(/\/$/, '')}/${ROOM}?token=${encodeURIComponent(token)}`
  console.log('Connecting to', wsUrl)
  const ws = new WebSocket(wsUrl)

  const timeout = setTimeout(() => {
    console.error('connection timed out')
    ws.terminate()
    process.exit(4)
  }, 5000)

  ws.on('open', () => {
    clearTimeout(timeout)
    console.log('connected successfully')
    ws.close()
    process.exit(0)
  })

  ws.on('close', (code, reason) => {
    clearTimeout(timeout)
    console.error('closed', code, reason && reason.toString())
    process.exit(5)
  })

  ws.on('error', (err) => {
    clearTimeout(timeout)
    console.error('ws error', err)
    process.exit(6)
  })
}

main().catch((err) => { console.error(err); process.exit(1) })
