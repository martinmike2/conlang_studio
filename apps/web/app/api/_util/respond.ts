import { ZodSchema } from 'zod'

export function jsonError(message: string, status = 400) {
  return Response.json({ error: { message } }, { status })
}

export async function parseJson<T>(req: Request, schema: ZodSchema<T>) {
  let raw: unknown
  try { raw = await req.json() } catch { return { error: jsonError('Invalid JSON', 400) } }
  const result = schema.safeParse(raw)
  if (!result.success) {
    return { error: jsonError(result.error.errors.map(e => e.message).join('; '), 400) }
  }
  return { data: result.data }
}

export function success(data: unknown, status = 200) {
  return Response.json({ data }, { status })
}