import { NextRequest } from "next/server"
import { z } from "zod"
import { parseJson, success, jsonError } from "../../_util/respond"

const intakeSchema = z.object({
  donorLanguage: z.string().min(1),
  recipientLanguage: z.string().min(1),
  sourceText: z.string().min(1),
  normalizedForm: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})

export async function POST(req: NextRequest) {
  const jsonResult = await parseJson(req, intakeSchema)
  if ('error' in jsonResult) return jsonResult.error

  // Delegate core logic to testable helper
  try {
    const mod = await import('@core/borrowing')
    const service = mod.createBorrowingService()
    const created = await handleIntake(service.createContactEvent.bind(service), jsonResult.data)
    return success(created, 201)
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e)
    return jsonError('Service unavailable: ' + msg, 503)
  }
}

// Exported helper used by integration tests. Separated from the Next.js handler so
// tests can call the logic directly without constructing HTTP requests.
// The service function expects a concrete input type at runtime; keep the
// alias permissive while documenting its intent.
// The service function expects a concrete input type at runtime; keep the
// alias permissive while documenting its intent.
// The service function expects a concrete input type at runtime. Use `any`
// here so tests can bind the actual service method directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleIntake(createContactEvent: any, body: unknown) {
  // Validate the body against the intake schema
  const parsed = intakeSchema.safeParse(body)
  if (!parsed.success) throw new Error('invalid input: ' + parsed.error.errors.map((e) => e.message).join('; '))

  // Call the provided service function and return the created record
  const created = await createContactEvent(parsed.data)
  return created
}
