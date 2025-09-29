import pino from "pino"
import { getRequestContext } from "./context"

// Base logger instance
const base = pino({
    level: process.env.LOG_LEVEL || "info",
    redact: ["req.headers.authorization"],
    transport: process.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined
})

export function getLogger() {
    const ctx = getRequestContext()
    return ctx ? base.child({ reqId: ctx.requestId, jobId: ctx.jobId }) : base
}

export const logger = getLogger()