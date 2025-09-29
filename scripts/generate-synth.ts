#!/usr/bin/env tsx
import { generateSynthetic } from '../packages/testkits/synth/generator'

interface Args { phonemes: number; lexemes: number }

function parseArgs(): Args {
  const args = process.argv.slice(2)
  let phonemes = 10
  let lexemes = 5
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--phonemes' || a === '-p') && args[i+1]) phonemes = Number(args[++i])
    else if ((a === '--lexemes' || a === '-l') && args[i+1]) lexemes = Number(args[++i])
  }
  return { phonemes, lexemes }
}

const { phonemes, lexemes } = parseArgs()
const out = generateSynthetic({ phonemeCount: phonemes, lexemeCount: lexemes })
process.stdout.write(JSON.stringify(out, null, 2) + '\n')