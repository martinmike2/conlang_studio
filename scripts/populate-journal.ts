import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const migrationsDir = path.resolve(__dirname, '..', 'packages', 'db', 'migrations')
const metaPath = path.join(migrationsDir, 'meta', '_journal.json')

function sha256(contents: string) {
  return crypto.createHash('sha256').update(contents, 'utf8').digest('hex')
}

function main() {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  const entries = files.map(f => {
    const fp = path.join(migrationsDir, f)
    const content = fs.readFileSync(fp, 'utf8')
    return {
      name: f,
      checksum: sha256(content),
      created_at: Date.now()
    }
  })

  const journal = {
    version: '7',
    dialect: 'postgresql',
    entries
  }

  console.log('Previewing', entries.length, 'entries:')
  console.table(entries.map(e => ({ name: e.name, checksum: e.checksum.slice(0, 12) + '...' })))

  // write file
  fs.writeFileSync(metaPath, JSON.stringify(journal, null, 2) + '\n')
  console.log('Wrote', metaPath)
}

main()
