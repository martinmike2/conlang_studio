import { NextRequest } from "next/server"
import { subscribeActivity, type ActivityLogRecord } from "@core/activity"

export const runtime = "nodejs"

const encoder = new TextEncoder()

function formatEvent(data: ActivityLogRecord) {
  const payload = {
    ...data,
    occurredAt: data.occurredAt instanceof Date ? data.occurredAt.toISOString() : data.occurredAt
  }
  return `data: ${JSON.stringify(payload)}\n\n`
}

export async function GET(req: NextRequest) {
  let unsubscribe: (() => void) | undefined
  const keepAliveIntervalMs = 15000
  let keepAlive: NodeJS.Timeout | undefined
  const scopeFilter = req.nextUrl.searchParams.get("scope") ?? null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ActivityLogRecord) => {
        if (scopeFilter && event.scope !== scopeFilter) return
        controller.enqueue(encoder.encode(formatEvent(event)))
      }

      unsubscribe = subscribeActivity(send)
      controller.enqueue(encoder.encode(`: connected ${new Date().toISOString()}\n\n`))
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
      }, keepAliveIntervalMs)
    },
    cancel() {
      unsubscribe?.()
      if (keepAlive) clearInterval(keepAlive)
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  })
}
