/// <reference types="node" />
import { subscribeSemanticsEvents, type SemanticEventWithTimestamp } from "@core/semantics"

export const runtime = "nodejs"

const encoder = new TextEncoder()

function formatEvent(data: SemanticEventWithTimestamp) {
	return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET() {
	let unsubscribe: (() => void) | undefined
	const keepAliveIntervalMs = 15000
	let keepAlive: ReturnType<typeof setInterval> | undefined

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (event: SemanticEventWithTimestamp) => {
				controller.enqueue(encoder.encode(formatEvent(event)))
			}

			unsubscribe = subscribeSemanticsEvents(send)
			// send an initial comment so that EventSource opens cleanly
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