/* Centralized environment loader.
 * Ensures a single .env (at repo root) is loaded exactly once regardless of
 * which workspace package a script runs from. Falls back to nearest .env if root not found.
 */
import * as dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

let loaded = false

function findRepoRoot(startDir: string): string | null {
  let dir: string | undefined = startDir
  while (dir && dir !== '/' && dir !== '.') {
    const candidate = resolve(dir, 'pnpm-workspace.yaml')
    if (existsSync(candidate)) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

export function ensureEnv(): void {
  if (loaded) return
  const cwd = process.cwd()
  const repoRoot = findRepoRoot(cwd) || cwd
  const candidates = [
    resolve(repoRoot, '.env.local'),
    resolve(repoRoot, '.env'),
    // Fallback to current working dir if different
    resolve(cwd, '.env')
  ]
  for (const file of candidates) {
    if (existsSync(file)) {
      dotenv.config({ path: file })
      if (process.env.ENV_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[env] loaded', file)
      }
      loaded = true
      process.env.ENV_LOADED = 'true'
      return
    }
  }
  loaded = true
  if (process.env.ENV_DEBUG) {
    // eslint-disable-next-line no-console
    console.warn('[env] no .env file found in repo root or cwd')
  }
}

// Auto-load on import
ensureEnv()

export const env = process.env