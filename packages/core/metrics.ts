// Minimal metrics registry stub (histogram + counter placeholders)
export interface Counter { inc(v?: number): void }
export interface Histogram { observe(v: number): void }

class NoopCounter implements Counter { constructor(private _n = 0) {} inc(v: number = 1) { this._n += v } }
class NoopHistogram implements Histogram { observe(_v: number) { /* noop */ } }

export const metrics = {
  counters: new Map<string, NoopCounter>(),
  histograms: new Map<string, NoopHistogram>(),
  counter(name: string): Counter {
    let c = this.counters.get(name)
    if (!c) { c = new NoopCounter(); this.counters.set(name, c) }
    return c
  },
  histogram(name: string): Histogram {
    let h = this.histograms.get(name)
    if (!h) { h = new NoopHistogram(); this.histograms.set(name, h) }
    return h
  },
  snapshot() {
    return {
      counters: Object.fromEntries([...this.counters.entries()].map(([k, v]) => [k, (v as any)._n ?? 0]))
    }
  }
}
