import type { ActionPayloads, FlowAdapter, FlowEvent, RegisteredFlowName, RegisteredFlows, StepEnterEvent } from 'react-flow-app';

/**
 * Analytics on top of the event contract. It is a Provider adapter, not an app integration: app
 * integrations (`createFlowApp({ integrations })`) are typed by `createFlowApp` itself, and using
 * `Register` types there would be circular (`Register` depends on the app).
 */

// No `Extract` over `RegisteredEvent` here (not even as an alias constraint): each one cost ~1.5M
// type instantiations with 1000 actions, even in apps that do not use analytics.
type Payloads = ActionPayloads<RegisteredFlows>;

/** Where the action happened (the full `action` event, without the cost of extracting it). */
export type ActionContext = {
	flow: RegisteredFlowName;
	step: string;
	url: string;
	navigationId: number;
	overlay?: string;
};

export type PageView = {
	title: string;
	/** Path of the step (`/checkout/pay/42`), regardless of the browser's hash or path mode. */
	path: string;
	/** Path of this instance's previous step (for `page_referrer`). */
	referrer?: string;
	flow: string;
	step: string;
	properties?: Record<string, unknown>;
};

export type TrackCall = { name: string; properties?: Record<string, unknown> };

/** Where the calls go (GA4, Segment, or an in-house tool). */
export type AnalyticsSink = { page(view: PageView): void; track(call: TrackCall): void };

export type AnalyticsOptions = {
	/**
	 * Page view on every `step:enter`. The title defaults to the screen's `meta.title`, then to the
	 * step name. Return `false` to skip one page view; `page: false` turns them all off.
	 */
	page?: false | ((event: StepEnterEvent<RegisteredFlows>) => Partial<Pick<PageView, 'title' | 'properties'>> | false);
	/**
	 * Actions sent as events: opt-in, because payloads may hold personal data. A string sends the
	 * event without properties; a function picks the name and what leaves the payload.
	 */
	actions?: {
		[A in keyof Payloads]?: string | ((payload: Payloads[A], context: ActionContext) => TrackCall | false);
	};
	/** Flow start and exit as events (funnels). On by default. */
	flows?: boolean;
	/** Consent: while it returns `false`, nothing is sent (nor queued). */
	enabled?: () => boolean;
};

type FlowEventNames = { start: string; exit: string };

/** The implementation uses the generic event; `Register` types stay in the public signature only. */
type LooseOptions = {
	page?: false | ((event: StepEnterEvent) => Partial<Pick<PageView, 'title' | 'properties'>> | false);
	actions?: Record<string, string | ((payload: unknown, context: ActionContext) => TrackCall | false) | undefined>;
	flows?: boolean;
	enabled?: () => boolean;
};

const titleOf = (meta: unknown): string | undefined => {
	const title = (meta as { title?: unknown } | undefined)?.title;
	return typeof title === 'string' ? title : undefined;
};

/** Generic adapter: connects the event contract to any `AnalyticsSink`. */
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
				// The referrer follows navigation even without consent, so the next page view is right.
				const previous = referrer;
				if (event.type === 'step:enter') referrer = event.url;
				if (!enabled()) return;

				switch (event.type) {
					case 'step:enter': {
						const custom = page === false ? false : page ? page(event) : {};
						if (custom === false) return;
						sink.page({
							title: custom.title ?? titleOf(event.meta) ?? event.step,
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
 * Google Analytics 4 through `gtag.js`. In a SPA, the automatic page view must be off to avoid
 * double counting: `gtag('config', ID, { send_page_view: false })` and, in GA4, "Page changes
 * based on browser history events" off (Enhanced measurement).
 */
export function ga4(options: AnalyticsOptions & { gtag?: () => Gtag | undefined; origin?: string } = {}): FlowAdapter {
	// Resolved on every call: the snippet may load after the app starts.
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

/** Segment (analytics.js). Flow events follow Segment's "Object Action" naming. */
export function segment(options: AnalyticsOptions & { client?: () => SegmentLike | undefined; origin?: string } = {}): FlowAdapter {
	// Resolved on every call: the Segment snippet replaces `window.analytics` when it loads.
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
