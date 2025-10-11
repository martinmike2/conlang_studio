import { spawn, ChildProcess } from 'child_process'
import path from 'path'

let proc: ChildProcess | null = null

export default async function globalSetup() {
  const repoRoot = path.resolve(__dirname, '../../..')
  const cmd = 'pnpm'
  const args = ['dlx', 'y-websocket', '--port', '1234']

  // Start a collab websocket server via pnpm dlx (works in CI without pre-install)
  proc = spawn(cmd, args, { cwd: repoRoot, stdio: 'inherit' })

  // Wait briefly for server to initialize
  await new Promise((res) => setTimeout(res, 1200))

  process.env.NEXT_PUBLIC_COLLAB_WS_URL = 'ws://localhost:1234'

  return async () => {
    if (proc) {
      try {
        proc.kill('SIGINT')
      } catch (e) {
        // ignore
      }
    }
  }
}
