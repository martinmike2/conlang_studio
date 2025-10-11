#!/usr/bin/env node
// Lightweight wrapper to run the y-websocket server from the project
// Usage: node scripts/collab/y-websocket-server.js --port 1234
const { spawn } = require('child_process')
const args = process.argv.slice(2)
const portIndex = args.findIndex(a => a === '--port')
let port = 1234
if (portIndex >= 0 && args[portIndex + 1]) port = args[portIndex + 1]

const cmd = 'npx'
const cmdArgs = ['y-websocket', '--port', String(port)]

console.log(`Starting y-websocket server on port ${port} (via ${cmd} ${cmdArgs.join(' ')})`)
const p = spawn(cmd, cmdArgs, { stdio: 'inherit' })

p.on('close', code => {
  console.log('y-websocket exited with', code)
  process.exit(code)
})
