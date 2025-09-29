import { logger } from './logger'
import { metrics } from './metrics'
import { runWithRequestContext } from './context'

export interface JobLifecycleEvent {
  jobId: string
  name: string
  phase: 'start' | 'success' | 'error'
  ts: string
  detail?: Record<string, any>
}

export type JobFn<T> = () => Promise<T> | T

export async function runJob<T>(name: string, fn: JobFn<T>): Promise<T> {
  const jobId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
  const start = Date.now()
  const baseEvent = { jobId, name }
  emit({ ...baseEvent, phase: 'start', ts: new Date().toISOString() })
  const timer = metrics.histogram('job_duration_ms')
  try {
    const result = await runWithRequestContext({ requestId: jobId, jobId, start }, () => fn())
    timer.observe(Date.now() - start)
    emit({ ...baseEvent, phase: 'success', ts: new Date().toISOString() })
    metrics.counter('job_success_total').inc()
    return result
  } catch (err: any) {
    timer.observe(Date.now() - start)
    emit({ ...baseEvent, phase: 'error', ts: new Date().toISOString(), detail: { message: err?.message } })
    metrics.counter('job_error_total').inc()
    throw err
  }
}

const subscribers: ((e: JobLifecycleEvent)=>void)[] = []

export function subscribeJobEvents(fn: (e: JobLifecycleEvent)=>void) { subscribers.push(fn) }

function emit(e: JobLifecycleEvent) {
  logger.info({ evt: 'job', ...e }, 'job event')
  for (const s of subscribers) s(e)
}
