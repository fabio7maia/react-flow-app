import type { BrowserLike } from 'react-flow-app';

type Entry = { state: unknown; pathname: string; hash: string };

/**
 * In-memory fake browser to test the adapter without a DOM. It mimics the essentials: an entry
 * stack, synchronous push/replace and an asynchronous `go()` with `popstate` (as real browsers do).
 * Going back before the first entry means leaving the app.
 *
 * `previousPages`: entries of other sites before the app (1 by default). With 0, the app is the
 * first page of the tab and a `go()` before it is ignored, as in Firefox.
 */
export function createFakeBrowser(initial: { pathname?: string; hash?: string; previousPages?: number } = {}) {
	const previousPages = initial.previousPages ?? 1;
	const entries: Entry[] = [{ state: null, pathname: initial.pathname ?? '/', hash: initial.hash ?? '' }];
	let index = 0;
	let left = false;
	const listeners = new Set<() => void>();
	const calls: string[] = [];

	const write = (state: unknown, url: string): Entry => {
		const current = entries[index];
		return url.startsWith('#') ? { state, pathname: current.pathname, hash: url } : { state, pathname: url.split('#')[0], hash: '' };
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
			get length() {
				return previousPages + entries.length;
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
					// Out of range: browsers ignore it (History API spec).
					if (target < -previousPages) return;
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
		/** Browser back/forward button; waits for the popstate. */
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

/** Lets pending popstate events run (they may trigger new `go` calls). */
export const settle = async (): Promise<void> => {
	for (let i = 0; i < 5; i++) await Promise.resolve();
};
