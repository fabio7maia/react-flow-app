import type { BrowserLike } from 'react-flow-app';

/**
 * Um browser simulado dentro da página: barra de endereço, back/forward, reload e documentos.
 * Implementa o `BrowserLike` do adaptador `browserHistory`, por isso a demo mostra o adaptador
 * real a trabalhar sem mexer no histórico do separador onde a demo corre.
 *
 * Regras de um browser real que importam para a demo:
 * - `pushState`/`replaceState` não mudam de documento; `go()` dentro do mesmo documento dispara `popstate`;
 * - `go()` para uma entrada de outro documento carrega esse documento (a app arranca de novo, por deep link);
 * - `go()` para fora dos limites é ignorado.
 */
export type SimEntry = { doc: number; path: string; state: unknown };

export const EXTERNAL_DOC = 0;
export const ORIGIN = 'https://loja.exemplo';

export class SimBrowser {
	entries: SimEntry[] = [
		{ doc: EXTERNAL_DOC, path: 'https://www.pesquisa.exemplo/?q=loja', state: null },
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

	/** Muda quando outro documento é carregado: a app (re)arranca com esta chave. */
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

	/** O `window` que a app vê: amarrado ao documento atual. */
	readonly window: BrowserLike = (() => {
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

	/** Escrever um endereço e carregar: um documento novo (a app arranca a partir desse URL). */
	navigate(path: string): void {
		this.entries.splice(this.index + 1);
		this.entries.push({ doc: ++this.docs, path: path.startsWith('/') ? path : `/${path}`, state: null });
		this.index++;
		this.popListeners.clear();
		this.changed();
	}

	/** Recarregar: um documento novo na mesma entrada; as entradas do documento antigo passam a ser dele. */
	reload(): void {
		const old = this.current.doc;
		if (old === EXTERNAL_DOC) return;
		const doc = ++this.docs;
		this.entries = this.entries.map(entry => (entry.doc === old ? { ...entry, doc } : entry));
		this.popListeners.clear();
		this.changed();
	}
}
