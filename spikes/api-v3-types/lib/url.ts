import type { FlowApp } from './app';
import type { HistoryEntry } from './types';

export type FlowParams = Readonly<Record<string, string>>;

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

/** Padrão do URL de um passo: `/{baseUrl}/{url do passo ou nome}` (como na v2). */
export function urlPattern(app: FlowApp, flowName: string, step: string): string {
	const flow = app.getFlow(flowName);
	const base = trimSlashes(flow?.baseUrl ?? '');
	const segment = trimSlashes(flow?.steps[step]?.url ?? step);
	return `/${[base, segment].filter(Boolean).join('/')}`;
}

/** URL concreto: substitui `:param` pelos valores conhecidos (os em falta ficam literais). */
export function buildUrl(app: FlowApp, entry: HistoryEntry, params: FlowParams = {}): string {
	return urlPattern(app, entry.flow, entry.step).replace(/:(\w+)/g, (match, name: string) =>
		name in params ? encodeURIComponent(params[name]) : match
	);
}

export type UrlMatch = { flow: string; step: string; params: FlowParams; redirected: boolean };

/**
 * Resolve um URL (deep link) para um passo. Só passos `entrypoint` podem ser abertos
 * diretamente; um URL de outro passo redireciona para o passo inicial desse flow.
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
