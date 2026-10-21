import type { ActionPayloads, FlowEvent, StepEnterEvent } from './app';
import type { FlowAdapter } from './adapters';
import type { RegisteredFlowName, RegisteredFlows } from './flow';

/**
 * Analytics por cima do contrato de eventos. Um adaptador, não uma integração da app:
 * as integrações (`createFlowApp({ integrations })`) são tipadas pelo próprio `createFlowApp`,
 * e usar ali tipos do `Register` criava um ciclo (o `Register` depende do `flowApp`).
 */

// Sem `Extract` sobre o `RegisteredEvent` (nem como restrição de um alias): cada um custava
// ~1,5M instanciações com 1000 ações, mesmo em apps que não usam analytics.
type Payloads = ActionPayloads<RegisteredFlows>;

/** Onde a ação aconteceu (o evento `action` completo, sem o custo de o extrair da union). */
export type ActionContext = {
	flow: RegisteredFlowName;
	step: string;
	url: string;
	navigationId: number;
	overlay?: string;
};

export type PageView = {
	title: string;
	/** Caminho do passo (`/checkout/pay/42`), independente do modo hash/path do browser. */
	path: string;
	/** Caminho do passo anterior desta instância (para `page_referrer`). */
	referrer?: string;
	flow: string;
	step: string;
	properties?: Record<string, unknown>;
};

export type TrackCall = { name: string; properties?: Record<string, unknown> };

/** Para onde vão as chamadas (GA4, Segment, ou uma ferramenta interna). */
export type AnalyticsSink = { page(view: PageView): void; track(call: TrackCall): void };

export type AnalyticsOptions = {
	/**
	 * Page view em cada `step:enter`. Por omissão, o título é `meta.title` do ecrã ou o nome
	 * do passo. Devolver `false` salta esse page view; `page: false` desliga-os todos.
	 */
	page?: false | ((event: StepEnterEvent<RegisteredFlows>) => Partial<Pick<PageView, 'title' | 'properties'>> | false);
	/**
	 * Ações a enviar como eventos: opt-in, porque os payloads podem ter dados pessoais.
	 * `'nome'` envia sem propriedades; uma função escolhe o nome e o que sai do payload.
	 */
	actions?: {
		[A in keyof Payloads]?: string | ((payload: Payloads[A], context: ActionContext) => TrackCall | false);
	};
	/** Início e saída de flows como eventos (funis). Por omissão: ligado. */
	flows?: boolean;
	/** Consentimento: enquanto devolver `false`, nada é enviado (nem fica em fila). */
	enabled?: () => boolean;
};

type FlowEventNames = { start: string; exit: string };

/** A implementação usa o evento genérico; os tipos do `Register` ficam só na assinatura pública. */
type LooseOptions = {
	page?: false | ((event: StepEnterEvent) => Partial<Pick<PageView, 'title' | 'properties'>> | false);
	actions?: Record<string, string | ((payload: unknown, context: ActionContext) => TrackCall | false) | undefined>;
	flows?: boolean;
	enabled?: () => boolean;
};

/** Adaptador genérico: liga o contrato de eventos a qualquer `AnalyticsSink`. */
export function analytics(
	sink: AnalyticsSink,
	options: AnalyticsOptions = {},
	names: FlowEventNames = { start: 'flow_start', exit: 'flow_exit' }
): FlowAdapter {
	const { page, actions = {}, flows = true, enabled = () => true } = options as unknown as LooseOptions;

	return {
		attach(engine) {
			let referrer: string | undefined;

			return engine.on('*', (event: FlowEvent) => {
				// O referrer acompanha a navegação mesmo sem consentimento, para o page view seguinte ser correto.
				const previous = referrer;
				if (event.type === 'step:enter') referrer = event.url;
				if (!enabled()) return;

				switch (event.type) {
					case 'step:enter': {
						const custom = page === false ? false : page ? page(event) : {};
						if (custom === false) return;
						sink.page({
							title: custom.title ?? event.meta?.title ?? event.step,
							path: event.url,
							referrer: previous,
							flow: event.flow,
							step: event.step,
							properties: custom.properties,
						});
						return;
					}
					case 'action': {
						const mapping = actions[event.action];
						if (!mapping) return;
						const { flow, step, url, navigationId, overlay } = event;
						const context = { flow: flow as RegisteredFlowName, step, url, navigationId, overlay };
						const call = typeof mapping === 'string' ? { name: mapping } : mapping(event.payload, context);
						if (call) sink.track(call);
						return;
					}
					case 'flow:start':
						if (flows) {
							sink.track({ name: names.start, properties: { flow: event.flow, step: event.step, source: event.source } });
						}
						return;
					case 'flow:exit':
						if (flows) {
							sink.track({ name: names.exit, properties: { flow: event.flow, step: event.step, reason: event.reason } });
						}
						return;
				}
			});
		},
	};
}

const globalOf = <T>(name: string): T | undefined => (globalThis as Record<string, unknown>)[name] as T | undefined;
const originOf = (): string => globalOf<{ origin: string }>('location')?.origin ?? '';

export type Gtag = (command: 'event', name: string, params?: Record<string, unknown>) => void;

/**
 * Google Analytics 4 via `gtag.js`. Numa SPA, o page view automático tem de estar desligado
 * para não contar a dobrar: `gtag('config', ID, { send_page_view: false })` e, no GA4,
 * "Page changes based on browser history events" desligado (Enhanced measurement).
 */
export function ga4(options: AnalyticsOptions & { gtag?: () => Gtag | undefined; origin?: string } = {}): FlowAdapter {
	// Resolvido em cada chamada: o snippet pode carregar depois do arranque.
	const gtag = (): Gtag | undefined => (options.gtag ?? (() => globalOf<Gtag>('gtag')))();
	const location = (path: string): string => `${options.origin ?? originOf()}${path}`;

	return analytics(
		{
			page: view =>
				gtag()?.('event', 'page_view', {
					page_title: view.title,
					page_location: location(view.path),
					page_referrer: view.referrer && location(view.referrer),
					flow: view.flow,
					step: view.step,
					...view.properties,
				}),
			track: call => gtag()?.('event', call.name, call.properties),
		},
		options
	);
}

export type SegmentLike = {
	page(name: string, properties?: Record<string, unknown>): void;
	track(event: string, properties?: Record<string, unknown>): void;
};

/** Segment (analytics.js). Segue a convenção "Object Action" do Segment para os eventos de flow. */
export function segment(
	options: AnalyticsOptions & { client?: () => SegmentLike | undefined; origin?: string } = {}
): FlowAdapter {
	// Resolvido em cada chamada: o snippet do Segment substitui `window.analytics` quando carrega.
	const client = (): SegmentLike | undefined => (options.client ?? (() => globalOf<SegmentLike>('analytics')))();
	const url = (path: string): string => `${options.origin ?? originOf()}${path}`;

	return analytics(
		{
			page: view =>
				client()?.page(view.title, {
					title: view.title,
					path: view.path,
					url: url(view.path),
					referrer: view.referrer && url(view.referrer),
					flow: view.flow,
					step: view.step,
					...view.properties,
				}),
			track: call => client()?.track(call.name, call.properties),
		},
		options,
		{ start: 'Flow Started', exit: 'Flow Exited' }
	);
}
