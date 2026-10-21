import type { FlowDef, RegisteredFlows } from './flow';
import type { RegisteredMeta, ScreenActions } from './types';

// ─── Contrato de eventos ──────────────────────────────────────────────────────
//
// Desenho orientado à performance do type-check: a union tem UM membro por tipo
// de evento e UM membro por nome de ação (não por flow × passo × ação). Com 300
// ecrãs, a versão "produto cartesiano" levava o check de 1,5 s para 8,6 s.
// `flow` e `step` são unions simples (não correlacionadas entre si); o payload
// continua correlacionado com a ação, que é o que importa para integrações.

type EventBase = {
	readonly navigationId: number;
	readonly timestamp: number;
	/** URL do passo (`/baseUrl/url`), como nos listeners da v2. Útil para page views. */
	readonly url: string;
};

type FlowNameOf<F> = F extends FlowDef<infer N> ? N : never;
type StepNameOfAny<F> = F extends FlowDef<string, infer S> ? keyof S & string : never;
type ScreensOf<F> = F extends FlowDef<string, infer S, infer O> ? S[keyof S]['screen'] | O[keyof O] : never;

type ActionPairs<Sc> = Sc extends unknown
	? { [A in keyof ScreenActions<Sc> & string]: [A, ScreenActions<Sc>[A]] }[keyof ScreenActions<Sc> & string]
	: never;

/**
 * `{ pay: { ok: boolean }; cancel: undefined; ... }` agregado de todos os ecrãs dos flows.
 * Mapped type com `as`: chaves repetidas (a mesma ação em vários ecrãs) juntam os payloads
 * numa union, numa só passagem (um `Extract` por ação seria quadrático).
 */
export type ActionPayloads<F> = { [P in ActionPairs<ScreensOf<F>> as P[0]]: P[1] };

type Where<F> = { flow: FlowNameOf<F>; step: StepNameOfAny<F> };

type ActionEvent<F> = {
	[A in keyof ActionPayloads<F>]: Where<F> &
		EventBase & { type: 'action'; action: A; payload: ActionPayloads<F>[A]; overlay?: string };
}[keyof ActionPayloads<F>];

/** Union discriminada de todos os eventos possíveis para um conjunto de flows. */
export type FlowEvent<F = FlowDef> =
	| (Where<F> & EventBase & { type: 'flow:start'; source: 'initial' | 'api' | 'goto' | 'back' })
	| (Where<F> & EventBase & { type: 'step:leave'; reason: 'dispatch' | 'back' | 'exit' | 'start' })
	| (Where<F> &
			EventBase & {
				type: 'step:enter';
				direction: 'forward' | 'back';
				from?: { flow: string; step: string };
				meta?: RegisteredMeta;
			})
	/** O flow deixou de estar ativo (v2: backExit / onFlowUnmount). */
	| (Where<F> & EventBase & { type: 'flow:exit'; reason: 'exit' | 'back' | 'goto' | 'start' })
	/** `back()` sem histórico: nada para onde voltar (novo na v3). */
	| (Where<F> & EventBase & { type: 'back:empty' })
	| (Where<F> & EventBase & { type: 'action:unhandled'; action: string })
	| ActionEvent<F>;

export type FlowEventType = FlowEvent['type'];

export type RegisteredEvent = FlowEvent<RegisteredFlows>;

// ─── App ──────────────────────────────────────────────────────────────────────

export type FlowAppOptions<F extends readonly FlowDef[]> = {
	/** Integrações (analytics, logging…) que recebem todos os eventos de todas as instâncias. */
	integrations?: ReadonlyArray<(event: FlowEvent<F[number]>) => void>;
};

/** Definição da app: só dados, sem estado. O estado vive em cada engine/Provider. */
export type FlowApp<F extends readonly FlowDef[] = readonly FlowDef[]> = {
	readonly kind: 'app';
	readonly flows: F;
	readonly options: FlowAppOptions<F>;
	getFlow(name: string): FlowDef | undefined;
};

export function createFlowApp<const F extends readonly FlowDef[]>(flows: F, options: FlowAppOptions<F> = {}): FlowApp<F> {
	const byName = new Map<string, FlowDef>();

	for (const flow of flows) {
		if (byName.has(flow.name)) {
			throw new Error(`[react-flow-app] Flow duplicado: ${flow.name}`);
		}
		byName.set(flow.name, flow);
	}

	return { kind: 'app', flows, options, getFlow: name => byName.get(name) };
}
