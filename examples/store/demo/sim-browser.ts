import type { BrowserLike } from 'react-flow-app';

/**
 * A browser simulated inside the page: address bar, back/forward, reload and documents. It
 * implements the `BrowserLike` of the `browserHistory` adapter, so the demo shows the real adapter
 * at work without touching the history of the tab the demo runs in.
 *
 * Rules of a real browser that matter for the demo:
 * - `pushState`/`replaceState` do not change document; `go()` within the same document fires `popstate`;
 * - `go()` to an entry of another document loads that document (the app starts again, by deep link);
 * - `go()` out of range is ignored.
 */
export type SimEntry = { doc: number; path: string; state: unknown };

export const EXTERNAL_DOC = 0;
export const ORIGIN = 'https://store.example';

export class SimBrowser {
	entries: SimEntry[] = [
		{ doc: EXTERNAL_DOC, path: 'https://search.example/?q=store', state: null },
		{ doc: 1, path: '/', state: null },
	];
	index = 1;
	private docs = 1;
	private popListeners = new Set<() => void>();
	private subscribers = new Set<() => void>();
	private version = 0;

	get current(): SimEntry {
		return this.entries[this.index];
	}

	/** Changes when another document loads: the app (re)starts with this key. */
	get doc(): number {
		return this.current.doc;
	}

	get canGoBack(): boolean {
		return this.index > 0;
	}

	get canGoForward(): boolean {
		return this.index < this.entries.length - 1;
	}

	get address(): string {
		return this.current.doc === EXTERNAL_DOC ? this.current.path : `${ORIGIN}${this.current.path}`;
	}

	subscribe = (cb: () => void): (() => void) => {
		this.subscribers.add(cb);
		return () => this.subscribers.delete(cb);
	};

	getVersion = (): number => this.version;

	private changed(): void {
		this.version++;
		this.subscribers.forEach(cb => cb());
	}

	/** The `window` the app sees: bound to the current document. */
	readonly window: BrowserLike = (() => {
		// eslint-disable-next-line @typescript-eslint/no-this-alias -- the getters of an object literal need the instance
		const self = this;
		return {
			location: {
				get pathname() {
					return self.current.path;
				},
				get hash() {
					return '';
				},
			},
			history: {
				get state() {
					return self.current.state;
				},
				get length() {
					return self.entries.length;
				},
				pushState(state, _title, url) {
					self.entries.splice(self.index + 1);
					self.entries.push({ doc: self.current.doc, path: url, state });
					self.index++;
					self.changed();
				},
				replaceState(state, _title, url) {
					self.entries[self.index] = { doc: self.current.doc, path: url, state };
					self.changed();
				},
				go(delta) {
					queueMicrotask(() => self.traverse(delta));
				},
			},
			addEventListener: (_type, listener) => self.popListeners.add(listener),
			removeEventListener: (_type, listener) => self.popListeners.delete(listener),
		};
	})();

	private traverse(delta: number): void {
		const target = this.index + delta;
		if (target < 0 || target >= this.entries.length || delta === 0) return;
		const sameDocument = this.entries[target].doc === this.current.doc;
		this.index = target;
		if (sameDocument) this.popListeners.forEach(listener => listener());
		this.changed();
	}

	back(): void {
		this.window.history.go(-1);
	}

	forward(): void {
		this.window.history.go(1);
	}

	/** Typing an address and loading it: a new document (the app starts from that URL). */
	navigate(path: string): void {
		this.entries.splice(this.index + 1);
		this.entries.push({ doc: ++this.docs, path: path.startsWith('/') ? path : `/${path}`, state: null });
		this.index++;
		this.popListeners.clear();
		this.changed();
	}

	/** Reload: a new document on the same entry; the entries of the old document now belong to it. */
	reload(): void {
		const old = this.current.doc;
		if (old === EXTERNAL_DOC) return;
		const doc = ++this.docs;
		this.entries = this.entries.map(entry => (entry.doc === old ? { ...entry, doc } : entry));
		this.popListeners.clear();
		this.changed();
	}
}
