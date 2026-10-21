import type { BrowserLike } from 'react-flow-app';

type Entry = { state: unknown; pathname: string; hash: string };

/**
 * Browser falso em memória para testar o adaptador sem DOM. Imita o essencial:
 * pilha de entradas, push/replace síncronos e `go()` assíncrono com `popstate`
 * (como nos browsers reais). Recuar para antes da primeira entrada = sair da app.
 */
export function createFakeBrowser(initial: { pathname?: string; hash?: string } = {}) {
	const entries: Entry[] = [{ state: null, pathname: initial.pathname ?? '/', hash: initial.hash ?? '' }];
	let index = 0;
	let left = false;
	const listeners = new Set<() => void>();
	const calls: string[] = [];

	const write = (state: unknown, url: string): Entry => {
		const current = entries[index];
		return url.startsWith('#')
			? { state, pathname: current.pathname, hash: url }
			: { state, pathname: url.split('#')[0], hash: '' };
	};

	const browser: BrowserLike = {
		location: {
			get pathname() {
				return entries[index].pathname;
			},
			get hash() {
				return entries[index].hash;
			},
		},
		history: {
			get state() {
				return entries[index].state;
			},
			pushState(state, _title, url) {
				calls.push('push');
				entries.splice(index + 1);
				entries.push(write(state, url));
				index++;
			},
			replaceState(state, _title, url) {
				calls.push('replace');
				entries[index] = write(state, url);
			},
			go(delta) {
				const target = index + delta;
				queueMicrotask(() => {
					if (target < 0) {
						left = true;
						return;
					}
					if (target >= entries.length) return;
					index = target;
					listeners.forEach(listener => listener());
				});
			},
		},
		addEventListener: (_type, listener) => listeners.add(listener),
		removeEventListener: (_type, listener) => listeners.delete(listener),
	};

	return {
		browser,
		calls,
		/** Botão back/forward do browser; espera pelo popstate. */
		back: async (): Promise<void> => {
			browser.history.go(-1);
			await settle();
		},
		forward: async (): Promise<void> => {
			browser.history.go(1);
			await settle();
		},
		url: (): string => `${entries[index].pathname}${entries[index].hash}`,
		size: (): number => entries.length,
		position: (): number => index,
		hasLeft: (): boolean => left,
	};
}

/** Deixa correr os popstate pendentes (que podem originar novos `go`). */
export const settle = async (): Promise<void> => {
	for (let i = 0; i < 5; i++) await Promise.resolve();
};
