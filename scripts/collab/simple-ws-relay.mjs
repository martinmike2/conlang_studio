#!/usr/bin/env node

// Minimal Y.js WebSocket server for development
// This is a simplified version without auth for testing purposes

import http from 'http'
import { WebSocketServer } from 'ws'

const port = process.argv[2] || 1234
const rooms = new Map() // Map<roomId, Set<WebSocket>>

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('Y.js WebSocket relay server')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const roomId = url.pathname.slice(1) || 'default'
  
  console.log(`[collab] Client connected to room: ${roomId}`)
  
  // Add to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set())
  }
  const room = rooms.get(roomId)
  room.add(ws)
  
  // Relay messages to all other clients in the same room
  ws.on('message', (data) => {
    room.forEach(client => {
      if (client !== ws && client.readyState === 1) { // 1 = OPEN
        client.send(data)
      }
    })
  })
  
  ws.on('close', () => {
    room.delete(ws)
    if (room.size === 0) {
      rooms.delete(roomId)
    }
    console.log(`[collab] Client disconnected from room: ${roomId}`)
  })
  
  ws.on('error', (err) => {
    console.error('[collab] WebSocket error:', err)
  })
})

server.listen(port, () => {
  console.log(`[collab] WebSocket relay running at ws://localhost:${port}`)
  console.log('[collab] No authentication - for development only!')
})

process.on('SIGINT', () => {
  console.log('\n[collab] Shutting down...')
  server.close(() => process.exit(0))
})
