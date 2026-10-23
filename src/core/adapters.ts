import type { FlowApp } from './app';
import type { FlowEngine } from './engine';
import { type FlowParams, matchUrl } from './url';

/**
 * Adapters connect the engine (which has no DOM) to the platform: URL and browser, scroll, etc.
 * The core does not depend on them, so it still runs in React Native and in Node tests.
 */
export type FlowAdapter = {
	/** Initial step from the platform (e.g. a deep link). Read before the engine is created. */
	initial?(app: FlowApp): { flow: string; step: string; params?: FlowParams } | undefined;
	/** Connects to the engine. Returns the function that disconnects it. */
	attach(engine: FlowEngine): () => void;
	/** Called by the UI layer when the screen of the current step is mounted. */
	screenReady?(): void;
};

/** The subset of `window` the adapter uses (allows tests without a DOM). */
export type BrowserLike = {
	location: { pathname: string; hash: string };
	history: {
		readonly state: unknown;
		readonly length: number;
		pushState(state: unknown, title: string, url: string): void;
		replaceState(state: unknown, title: string, url: string): void;
		go(delta: number): void;
	};
	addEventListener(type: 'popstate', listener: () => void): void;
	removeEventListener(type: 'popstate', listener: () => void): void;
};

/** `before`: entries of other sites before the app's first entry (0 = first page of the tab). */
type EntryState = { rfa: true; index: number; before: number };

const isOurs = (state: unknown): state is EntryState => typeof state === 'object' && state !== null && (state as EntryState).rfa === true;

/**
 * URL plus the browser's back and forward buttons.
 *
 * - moving forward → `pushState`; leaving an `ignoreHistory` step, cutting a cycle or `clearHistory` → `replaceState`
 * - browser back (`popstate`) → `engine.back()`; with no engine history it leaves the app (the user is not
 *   trapped) or, when the app is the first page of the tab (nowhere to leave to), stays and restores the URL
 * - back from the UI → `history.go(-1)`, to keep the browser aligned
 * - browser forward → does not navigate (the engine has no "forward"); the URL is restored
 */
export function browserHistory(options: { mode?: 'hash' | 'path'; basename?: string; browser?: BrowserLike } = {}): FlowAdapter {
	const { mode = 'hash', basename = '' } = options;
	const browser = (): BrowserLike => options.browser ?? (globalThis as unknown as { window: BrowserLike }).window;
	// Server render (SSR): no window, so no deep link; the Provider uses its `initial` step.
	const hasBrowser = (): boolean => options.browser !== undefined || typeof (globalThis as { window?: unknown }).window !== 'undefined';
	const href = (url: string): string => (mode === 'hash' ? `#${url}` : `${basename}${url}`);
	const currentPath = (b: BrowserLike): string =>
		mode === 'hash' ? b.location.hash.replace(/^#/, '') || '/' : b.location.pathname.slice(basename.length) || '/';

	return {
		initial(app) {
			if (!hasBrowser()) return undefined;
			const match = matchUrl(app, currentPath(browser()));
			return match && { flow: match.flow, step: match.step, params: match.params };
		},
		attach(engine) {
			const b = browser();
			let index = 0;
			// On a fresh load the app is at the end of the session history: what comes before belongs to other sites.
			const before = isOurs(b.history.state) ? (b.history.state.before ?? 0) : b.history.length - 1;
			let ignoredPops = 0;
			let handlingPop = false;
			let depth = engine.getSnapshot().history.length;

			const urlNow = (): string => {
				const { flow, step, params } = engine.getSnapshot();
				return flow && step ? href(engine.urlOf({ flow, step }, params)) : '';
			};
			const write = (method: 'pushState' | 'replaceState'): void => {
				if (method === 'pushState') index++;
				b.history[method]({ rfa: true, index, before } satisfies EntryState, '', urlNow());
			};

			if (isOurs(b.history.state)) index = b.history.state.index;
			write('replaceState');

			const offEnter = engine.on('step:enter', event => {
				const next = engine.getSnapshot().history.length;
				if (handlingPop) {
					write('replaceState');
				} else if (event.direction === 'forward') {
					write(next > depth ? 'pushState' : 'replaceState');
				} else {
					// Back started from the UI (or goto.exit): go back one browser entry and fix the URL on popstate.
					ignoredPops++;
					b.history.go(-1);
				}
				depth = next;
			});

			const onPopState = (): void => {
				const state = b.history.state;
				if (!isOurs(state)) return;

				if (ignoredPops > 0) {
					ignoredPops--;
					index = state.index;
					write('replaceState');
					return;
				}

				if (state.index < index) {
					index = state.index;
					const snapshot = engine.getSnapshot();
					handlingPop = true;
					engine.back();
					handlingPop = false;
					if (engine.getSnapshot() !== snapshot) return;
					if (before > 0) {
						// Nowhere to go back to in the engine: let the browser leave the app.
						ignoredPops++;
						b.history.go(-(state.index + 1));
					} else {
						// With no previous page, a go() out of the app would be ignored (Firefox) and the URL
						// would drift from the screen. Stay on the current step, with its URL.
						write('replaceState');
					}
				} else {
					// Browser forward: no engine equivalent; restore the URL of the current step.
					index = state.index;
					write('replaceState');
				}
			};

			b.addEventListener('popstate', onPopState);
			return () => {
				offEnter();
				b.removeEventListener('popstate', onPopState);
			};
		},
	};
}

/**
 * Saves the scroll position when moving forward and restores it when going back, once the screen
 * is mounted (`screenReady`) instead of after a fixed timeout. Moving forward scrolls to the top.
 */
export function scrollRestoration(options: { get?: () => number; set?: (top: number) => void } = {}): FlowAdapter {
	type ScrollWindow = { scrollY: number; scrollTo(options: { top: number }): void };
	const win = (): ScrollWindow => (globalThis as unknown as { window: ScrollWindow }).window;
	const get = options.get ?? ((): number => win().scrollY);
	const set = options.set ?? ((top: number): void => win().scrollTo({ top }));
	const positions = new Map<string, number>();
	let pending: number | undefined;

	return {
		attach(engine) {
			const key = (flow: string, step: string): string => `${flow}.${step}#${engine.getSnapshot().history.length}`;

			const offLeave = engine.on('step:leave', event => {
				if (event.reason === 'dispatch' || event.reason === 'start') {
					positions.set(key(event.flow, event.step), get());
				}
			});
			const offEnter = engine.on('step:enter', event => {
				pending = event.direction === 'back' ? (positions.get(key(event.flow, event.step)) ?? 0) : 0;
			});
			return () => {
				offLeave();
				offEnter();
			};
		},
		screenReady() {
			if (pending !== undefined) {
				set(pending);
				pending = undefined;
			}
		},
	};
}
