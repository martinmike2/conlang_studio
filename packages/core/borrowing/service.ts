import { eq, type InferInsertModel } from "drizzle-orm"
import { getDb } from "../../db/client"
import { contactEvents, loanRules, loanRulesets } from "../../db/schema/core"
import { Worker } from 'worker_threads'
import { logger } from '../logger'
import { metrics } from '../metrics'

// Prefer RE2 if installed (safe regex engine). If not present, fall back to running
// replacements in a worker thread with a timeout so the main thread isn't blocked by
// catastrophic backtracking.
let RE2: any | null = null
try {
  // Use a dynamic require to avoid bundlers (webpack/next) trying to resolve the native
  // binary at build time (./build/Release/re2.node). This keeps server runtime behavior
  // while preventing module-not-found during frontend/SSR bundle steps.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dynamicRequire: any = Function('return require')()
  RE2 = dynamicRequire('re2')
} catch (e) {
  RE2 = null
}

type DbClient = ReturnType<typeof getDb>

type ContactEventInsert = InferInsertModel<typeof contactEvents>

export interface CreateContactEventInput {
  donorLanguage: string
  recipientLanguage: string
  sourceText: string
  normalizedForm?: string | null
  metadata?: Record<string, unknown>
}

export interface AdaptationCompletenessOptions {
  whitelist?: string[]
  tokenPattern?: RegExp
  focusSegments?: string[]
}

export interface AdaptationCompletenessResult {
  complete: boolean
  coverage: number
  totalSegments: number
  coveredSegments: number
  uncovered: Array<{ token: string; count: number }>
}

function tokenizeSegments(text: string, tokenPattern?: RegExp): string[] {
  const normalized = text.normalize('NFC')
  if (tokenPattern) {
    const globalPattern = tokenPattern.global ? tokenPattern : new RegExp(tokenPattern.source, tokenPattern.flags + (tokenPattern.flags.includes('g') ? '' : 'g'))
    const matches = normalized.match(globalPattern)
    return matches ? matches.map((m) => m.normalize('NFC')) : []
  }

  // Default: treat individual Unicode letters (including IPA symbols) as segments.
  const segments: string[] = []
  const letterRegex = /\p{L}/u
  for (const char of Array.from(normalized)) {
    if (letterRegex.test(char)) {
      segments.push(char)
    }
  }
  return segments
}

export function assessAdaptationCompleteness(
  donorForm: string,
  adaptedForm: string,
  options: AdaptationCompletenessOptions = {}
): AdaptationCompletenessResult {
  const whitelist = new Set((options.whitelist ?? []).map((w) => w.normalize('NFC')))
  const focus = options.focusSegments ? new Set(options.focusSegments.map((s) => s.normalize('NFC'))) : null
  const donorSegments = tokenizeSegments(donorForm, options.tokenPattern)
  const adaptedNormalized = adaptedForm.normalize('NFC')

  let uncoveredOccurrences = 0
  const uncoveredMap = new Map<string, number>()
  let totalSegments = 0

  for (const segment of donorSegments) {
    if (focus && !focus.has(segment)) {
      continue
    }
    totalSegments += 1
    if (whitelist.has(segment)) {
      continue
    }
    if (adaptedNormalized.includes(segment)) {
      uncoveredOccurrences += 1
      uncoveredMap.set(segment, (uncoveredMap.get(segment) ?? 0) + 1)
    }
  }

  const coveredSegments = totalSegments - uncoveredOccurrences
  const coverage = totalSegments === 0 ? 1 : coveredSegments / totalSegments

  return {
    complete: uncoveredOccurrences === 0,
    coverage,
    totalSegments,
    coveredSegments,
    uncovered: Array.from(uncoveredMap.entries()).map(([token, count]) => ({ token, count }))
  }
}

export function createBorrowingService(db: DbClient = getDb()) {
  // Basic safety guard for user-provided regex patterns. Keep modest to avoid obvious abuse.
  const MAX_PATTERN_LENGTH = 2000
  const WORKER_TIMEOUT_MS = 200

  async function safeReplace(text: string, pattern: string, replacement: string) {
    if (typeof pattern !== 'string') return text
    if (pattern.length > MAX_PATTERN_LENGTH) {
      logger.warn({ msg: 'skipping pattern (too long)', patternLength: pattern.length })
      try { metrics.counter('borrowing.skipped_pattern_too_long').inc() } catch (e) { /* noop */ }
      return text
    }

    // If RE2 is available, use it directly (fast + safe from backtracking)
    if (RE2) {
      try {
        const re = new RE2(pattern, 'g')
        return text.replace(re, replacement)
      } catch (e) {
        logger.warn({ msg: 'invalid regex pattern (RE2)', pattern })
        try { metrics.counter('borrowing.invalid_pattern').inc() } catch (e) { /* noop */ }
        return text
      }
    }

    // Fallback: delegate single replacement to the batched worker implementation
    const out = await safeReplaceBatch(text, [{ pattern, replacement }])
    return out
  }

  // Batch multiple replacements in a single worker to reduce worker-creation overhead.
  async function safeReplaceBatch(text: string, ops: Array<{ pattern: string; replacement: string }>) {
    // Pre-check length and types, log and skip any obviously invalid ops
    const filtered = ops.filter((op) => {
      if (typeof op.pattern !== 'string') return false
      if (op.pattern.length > MAX_PATTERN_LENGTH) {
        logger.warn({ msg: 'skipping pattern in batch (too long)', patternLength: op.pattern.length })
        try { metrics.counter('borrowing.skipped_pattern_too_long').inc() } catch (e) { /* noop */ }
        return false
      }
      return true
    })
    if (filtered.length === 0) return text

      if (RE2) {
      // Shouldn't reach here when RE2 exists, but keep as a fast path
      try {
        let cur = text
        for (const op of filtered) {
          const re = new RE2(op.pattern, 'g')
          cur = cur.replace(re, op.replacement)
        }
        return cur
      } catch (e) {
        logger.warn({ msg: 'batch RE2 execution failed', error: String(e) })
        try { metrics.counter('borrowing.invalid_pattern').inc() } catch (e) { /* noop */ }
        return text
      }
    }

    // Try to use worker_threads dynamically. In some Next.js dev/server bundling
    // setups, worker creation can be transformed into vendor-chunks which may not
    // exist at runtime (causing MODULE_NOT_FOUND). To remain robust, attempt to
    // load worker_threads dynamically, and fall back to a synchronous
    // replacement implementation when unavailable.
    try {
      // Dynamically require worker_threads to avoid bundlers resolving it.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynamicRequire: any = Function('return require')()
      const workerThreads = dynamicRequire('worker_threads')
      const { Worker: NodeWorker } = workerThreads
      return new Promise<string>((resolve) => {
        const workerCode = `
          const { parentPort } = require('worker_threads')
          parentPort.on('message', ({ text, ops }) => {
            try {
              let cur = text
              for (const { pattern, replacement } of ops) {
                try {
                  const re = new RegExp(pattern, 'g')
                  cur = cur.replace(re, replacement)
                } catch (e) {
                  // skip invalid pattern
                }
              }
              parentPort.postMessage({ ok: true, out: cur })
            } catch (err) {
              parentPort.postMessage({ ok: false })
            }
          })
        `

        const w = new NodeWorker(workerCode, { eval: true })
        let finished = false
        const timer = setTimeout(() => {
          if (!finished) {
            try { w.terminate() } catch (e) { /* ignore */ }
            finished = true
            logger.warn({ msg: 'regex worker timed out' })
            try { metrics.counter('borrowing.regex_worker_timeout').inc() } catch (e) { /* noop */ }
            resolve(text)
          }
        }, WORKER_TIMEOUT_MS)

        w.on('message', (msg: any) => {
          if (finished) return
          finished = true
          clearTimeout(timer)
          if (msg && msg.ok && typeof msg.out === 'string') resolve(msg.out)
          else resolve(text)
        })
        w.on('error', (err: unknown) => {
          if (finished) return
          finished = true
          clearTimeout(timer)
          logger.warn({ msg: 'regex worker error', error: String(err) })
          try { metrics.counter('borrowing.regex_worker_error').inc() } catch (e) { /* noop */ }
          resolve(text)
        })

        w.postMessage({ text, ops: filtered })
      })
    } catch (e) {
      // Fallback: run replacements synchronously on the main thread. This keeps
      // behavior consistent and avoids requiring runtime worker files in
      // environments where worker_threads is unavailable or bundlers rewrite
      // worker loading.
      try {
        let cur = text
        for (const { pattern, replacement } of filtered) {
          try {
            const re = new RegExp(pattern, 'g')
            cur = cur.replace(re, replacement)
          } catch (err: unknown) {
            // skip invalid pattern
          }
        }
        return Promise.resolve(cur)
      } catch (err: unknown) {
        return Promise.resolve(text)
      }
    }
  }

  return {
    async createContactEvent(input: CreateContactEventInput) {
      const toInsert: ContactEventInsert = {
        donorLanguage: input.donorLanguage,
        recipientLanguage: input.recipientLanguage,
        sourceText: input.sourceText,
        normalizedForm: input.normalizedForm ?? null,
        metadata: input.metadata ?? {}
      }

      const [created] = await db.insert(contactEvents).values(toInsert).returning()
      return created
    },

    async listActiveRulesets() {
      return db.select().from(loanRulesets).where(eq(loanRulesets.active, 1)).orderBy(loanRulesets.createdAt)
    },

    async applyRuleset(rulesetId: number, text: string) {
      const rules = await db.select().from(loanRules).where(eq(loanRules.rulesetId, rulesetId)).orderBy(loanRules.priority)
      let cur = text
      for (const r of rules) {
        try {
          cur = await safeReplace(cur, r.pattern, r.replacement)
        } catch (e) {
          // ignore invalid patterns
        }
      }
      return cur
    }

  ,

    /**
     * Apply a subset of rules from a ruleset. Options allow selecting by rule ids or by a max number
     * of rules (ordered by priority). Returns the transformed text and the list of applied rule ids.
     */
    async applyRulesetSubset(rulesetId: number, text: string, options?: { ids?: number[]; limit?: number }) {
      const all = await db.select().from(loanRules).where(eq(loanRules.rulesetId, rulesetId)).orderBy(loanRules.priority)
      let rules = all
      if (options?.ids && options.ids.length > 0) {
        const idSet = new Set(options.ids)
        rules = all.filter((r) => idSet.has(r.id))
      }
      if (options?.limit && options.limit > 0) {
        rules = rules.slice(0, options.limit)
      }
      let cur = text
      const applied: number[] = []
      for (const r of rules) {
        try {
          const before = cur
          cur = await safeReplace(cur, r.pattern, r.replacement)
          if (cur !== before) applied.push(r.id)
        } catch (e) {
          // ignore invalid patterns
        }
      }
      return { output: cur, applied }
    },

    assessAdaptationCompleteness
  }
}

export type BorrowingService = ReturnType<typeof createBorrowingService>
