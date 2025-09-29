import { execSync } from 'node:child_process'

// Performs a drizzle-kit status (which lists unapplied) without applying, acts as a dry-run indicator.
try {
  console.log('--- Drizzle Migration Dry Run (status) ---')
  execSync('pnpm -F db drizzle-kit status', { stdio: 'inherit' })
  console.log('--- End Dry Run ---')
} catch (e) {
  console.error('Dry run failed')
  process.exit(1)
}
