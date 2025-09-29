import { AsyncLocalStorage } from "node:async_hooks"

export interface RequestContext {
  requestId: string
  jobId?: string
  start: number
}

const als = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T | Promise<T>): T | Promise<T> {
  return als.run(ctx, fn)
}

export function getRequestContext(): RequestContext | undefined {
  return als.getStore()
}
