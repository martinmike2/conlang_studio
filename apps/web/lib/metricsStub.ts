import { metrics } from "@core/metrics"

const requestCounter = metrics.counter("web_requests_total")

export function recordRequest() {
    requestCounter.inc()
}

export function metricsSnapshot() {
    return metrics.snapshot()
}