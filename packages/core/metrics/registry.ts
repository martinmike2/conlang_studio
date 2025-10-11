export interface Counter { inc(v?: number): void }
export interface Histogram { observe(v: number): void }

class NoopCounter implements Counter {
  constructor(private _n = 0) {}
  inc(v: number = 1) {
    this._n += v
  }
  value() {
    return this._n
  }
}

class NoopHistogram implements Histogram {
  private values: number[] = []
  observe(v: number) {
    if (Number.isFinite(v)) {
      this.values.push(v)
    }
  }
  getValues() {
    return [...this.values]
  }
}

export const metrics = {
  counters: new Map<string, NoopCounter>(),
  histograms: new Map<string, NoopHistogram>(),
  counter(name: string): Counter {
    let c = this.counters.get(name)
    if (!c) {
      c = new NoopCounter()
      this.counters.set(name, c)
    }
    return c
  },
  histogram(name: string): Histogram {
    let h = this.histograms.get(name)
    if (!h) {
      h = new NoopHistogram()
      this.histograms.set(name, h)
    }
    return h
  },
  /**
   * Start a timing span for the given metric name. Returns a function that when
   * called will observe the elapsed milliseconds into a histogram named
   * `${name}.ms` and also return the duration in milliseconds.
   * Example:
   * const stop = metrics.startSpan('paradigm.regenerate')
   * ... do work ...
   * const ms = stop()
   */
  startSpan(name: string) {
    const start = Date.now()
    let stopped = false
    return () => {
      if (stopped) return 0
      stopped = true
      const dur = Date.now() - start
      this.histogram(`${name}.ms`).observe(dur)
      return dur
    }
  },
  snapshot() {
    return {
      counters: Object.fromEntries([...this.counters.entries()].map(([k, v]) => [k, v.value?.() ?? (v as any)._n ?? 0])),
      histograms: Object.fromEntries([...this.histograms.entries()].map(([k, v]) => [k, v.getValues?.() ?? []]))
    }
  },
  resetAll() {
    this.counters.clear()
    this.histograms.clear()
  }
}
