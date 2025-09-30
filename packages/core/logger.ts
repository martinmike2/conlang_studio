import pino, { type TransportSingleOptions } from "pino"
import { createRequire } from "node:module"
import { getRequestContext } from "./context"

const require = createRequire(import.meta.url)

let transport: TransportSingleOptions | undefined

if (process.env.NODE_ENV === "development") {
    try {
        require.resolve("pino-pretty")
        transport = { target: "pino-pretty", options: { colorize: true } }
    } catch (error) {
        if (process.env.LOG_PRETTY_SILENCE !== "1") {
            console.warn("pino-pretty not installed; falling back to JSON logs")
        }
        transport = undefined
    }
}

// Base logger instance
const base = pino({
    level: process.env.LOG_LEVEL || "info",
    redact: ["req.headers.authorization"],
    transport
})

export function getLogger() {
    const ctx = getRequestContext()
    return ctx ? base.child({ reqId: ctx.requestId, jobId: ctx.jobId }) : base
}

export const logger = getLogger()