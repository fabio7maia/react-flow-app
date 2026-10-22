import type { FlowApp } from './app';
import type { FlowDef } from './flow';
import type { HistoryEntry } from './types';

export type FlowParams = Readonly<Record<string, string>>;

// ─── Params typed from the URL pattern ────────────────────────────────────────

type Segments<P extends string> = P extends `${infer Head}/${infer Rest}` ? Head | Segments<Rest> : P;

/** `'pay/:orderId/:line'` → `'orderId' | 'line'`. */
export type ParamNames<P extends string> = Segments<P> extends infer S ? (S extends `:${infer N}` ? N : never) : never;

/**
 * `'pay/:orderId'` → `{ orderId: string }`. No params → `Record<string, never>` (not `{}`, which
 * would accept any object).
 */
export type ParamsOf<P extends string> = string extends P
	? FlowParams // non-literal pattern (generic code): no per-step typing
	: [ParamNames<P>] extends [never]
		? Record<string, never>
		: { [K in ParamNames<P>]: string };

/** The URL of a step is its declared `url` or, by default, the step name. */
export type StepUrl<F, Step> =
	F extends FlowDef<string, infer S>
		? Step extends keyof S
			? S[Step] extends { readonly url: infer U extends string }
				? U
				: Step & string
			: never
		: never;

export type StepParams<F, Step> = ParamsOf<StepUrl<F, Step>>;

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

/** URL pattern of a step: `/{baseUrl}/{step url or name}`. */
export function urlPattern(app: FlowApp, flowName: string, step: string): string {
	const flow = app.getFlow(flowName);
	const base = trimSlashes(flow?.baseUrl ?? '');
	const segment = trimSlashes(flow?.steps[step]?.url ?? step);
	return `/${[base, segment].filter(Boolean).join('/')}`;
}

/** Concrete URL: replaces `:param` with the known values (missing ones stay literal). */
export function buildUrl(app: FlowApp, entry: HistoryEntry, params: FlowParams = {}): string {
	return urlPattern(app, entry.flow, entry.step).replace(/:(\w+)/g, (match, name: string) =>
		name in params ? encodeURIComponent(params[name]) : match
	);
}

export type UrlMatch = { flow: string; step: string; params: FlowParams; redirected: boolean };

/**
 * Resolves a URL (deep link) to a step. Only `entrypoint` steps can be opened directly; the URL of
 * any other step redirects to the initial step of its flow.
 */
export function matchUrl(app: FlowApp, path: string): UrlMatch | undefined {
	const normalized = `/${trimSlashes(path.split(/[?#]/)[0])}`;

	for (const flow of app.flows) {
		for (const [step, opts] of Object.entries(flow.steps)) {
			const names: string[] = [];
			const source = urlPattern(app, flow.name, step).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(
				`^${source.replace(/:(\w+)/g, (_, name: string) => {
					names.push(name);
					return '([^/]+)';
				})}$`
			);
			const match = regex.exec(normalized);
			if (!match) continue;

			if (opts.entrypoint) {
				const params = Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
				return { flow: flow.name, step, params, redirected: false };
			}
			const entries = Object.entries(flow.steps);
			const initial = entries.find(([, o]) => o.initial)?.[0] ?? entries[0][0];
			return { flow: flow.name, step: initial, params: {}, redirected: true };
		}
	}
	return undefined;
}
