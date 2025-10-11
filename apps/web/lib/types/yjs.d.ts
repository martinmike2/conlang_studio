declare module 'yjs' {
	export class Doc {
		constructor()
		getMap<T = any>(name: string): YMap<T>
		destroy(): void
	}

	export interface YMap<T = any> {
		entries(): IterableIterator<[string, T]>
		set(key: string, value: T): void
		get(key: string): T | undefined
		observe(cb: () => void): void
		unobserve(cb: () => void): void
	}

	export { Doc }
}
