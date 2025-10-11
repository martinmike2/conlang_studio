#!/usr/bin/env node
// Lightweight wrapper to run the y-websocket server from the project
// Usage: node scripts/collab/y-websocket-server.cjs --port 1234
const { spawn } = require('child_process')
const args = process.argv.slice(2)
const portIndex = args.findIndex(a => a === '--port')
let port = 1234
if (portIndex >= 0 && args[portIndex + 1]) port = args[portIndex + 1]

// Prefer pnpm dlx if pnpm is available, fallback to npx
const usePnpmDlx = true
const cmd = usePnpmDlx ? 'pnpm' : 'npx'
const cmdArgs = usePnpmDlx ? ['dlx', 'y-websocket', '--port', String(port)] : ['y-websocket', '--port', String(port)]

console.log(`Starting y-websocket server on port ${port} (via ${cmd} ${cmdArgs.join(' ')})`)
const p = spawn(cmd, cmdArgs, { stdio: 'inherit' })

p.on('close', code => {
  console.log('y-websocket exited with', code)
  process.exit(code)
})
