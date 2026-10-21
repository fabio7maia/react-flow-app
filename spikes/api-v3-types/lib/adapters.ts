import type { FlowApp } from './app';
import type { FlowEngine } from './engine';
import { buildUrl, type FlowParams, matchUrl } from './url';

/**
 * Adaptadores ligam o engine (sem DOM) à plataforma: URL/browser, scroll, etc.
 * O core não depende deles, por isso continua a servir React Native e testes em Node.
 */
export type FlowAdapter = {
	/** Passo inicial a partir da plataforma (ex.: deep link). Lido antes de criar o engine. */
	initial?(app: FlowApp): { flow: string; step: string; params?: FlowParams } | undefined;
	/** Liga-se ao engine. Devolve a função para desligar. */
	attach(engine: FlowEngine): () => void;
	/** Chamado pela camada de UI quando o ecrã do passo atual está montado. */
	screenReady?(): void;
};

/** O subconjunto de `window` que o adaptador usa (permite testes sem DOM). */
export type BrowserLike = {
	location: { pathname: string; hash: string };
	history: {
		readonly state: unknown;
		pushState(state: unknown, title: string, url: string): void;
		replaceState(state: unknown, title: string, url: string): void;
		go(delta: number): void;
	};
	addEventListener(type: 'popstate', listener: () => void): void;
	removeEventListener(type: 'popstate', listener: () => void): void;
};

type EntryState = { rfa: true; index: number };

const isOurs = (state: unknown): state is EntryState =>
	typeof state === 'object' && state !== null && (state as EntryState).rfa === true;

/**
 * URL + botão back/forward do browser.
 *
 * - avançar → `pushState`; sair de um passo `ignoreHistory`, cortar um ciclo ou `clearHistory` → `replaceState`
 * - back do browser (`popstate`) → `engine.back()`; sem histórico no engine → sai da app (não prende o utilizador)
 * - back pela UI → `history.go(-1)`, para manter o browser alinhado
 * - forward do browser → não navega (o engine não tem "forward"); o URL é reposto
 */
export function browserHistory(
	options: { mode?: 'hash' | 'path'; basename?: string; browser?: BrowserLike } = {}
): FlowAdapter {
	const { mode = 'hash', basename = '' } = options;
	const browser = (): BrowserLike => options.browser ?? (globalThis as unknown as { window: BrowserLike }).window;
	const href = (url: string): string => (mode === 'hash' ? `#${url}` : `${basename}${url}`);
	const currentPath = (b: BrowserLike): string =>
		mode === 'hash' ? b.location.hash.replace(/^#/, '') || '/' : b.location.pathname.slice(basename.length) || '/';

	return {
		initial(app) {
			const match = matchUrl(app, currentPath(browser()));
			return match && { flow: match.flow, step: match.step, params: match.params };
		},
		attach(engine) {
			const b = browser();
			let index = 0;
			let ignoredPops = 0;
			let handlingPop = false;
			let depth = engine.getSnapshot().history.length;

			const urlNow = (): string => {
				const { flow, step, params } = engine.getSnapshot();
				return flow && step ? href(engine.urlOf({ flow, step }, params)) : '';
			};
			const write = (method: 'pushState' | 'replaceState'): void => {
				if (method === 'pushState') index++;
				b.history[method]({ rfa: true, index } satisfies EntryState, '', urlNow());
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
					// Back iniciado pela UI (ou goto.exit): recua uma entrada no browser e corrige o URL no popstate.
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
					const before = engine.getSnapshot();
					handlingPop = true;
					engine.back();
					handlingPop = false;
					if (engine.getSnapshot() === before) {
						// Nada para onde voltar no engine: deixa o browser sair da app.
						ignoredPops++;
						b.history.go(-(state.index + 1));
					}
				} else {
					// Forward do browser: sem equivalente no engine; repõe o URL do passo atual.
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
 * Guarda a posição de scroll ao avançar e repõe-na ao voltar, quando o ecrã está montado
 * (`screenReady`), em vez de um `setTimeout` fixo como na v2. Ao avançar, sobe ao topo.
 */
export function scrollRestoration(
	options: { get?: () => number; set?: (top: number) => void } = {}
): FlowAdapter {
	const win = (): { scrollY: number; scrollTo(options: { top: number }): void } =>
		(globalThis as unknown as { window: { scrollY: number; scrollTo(options: { top: number }): void } }).window;
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
				pending = event.direction === 'back' ? positions.get(key(event.flow, event.step)) ?? 0 : 0;
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
