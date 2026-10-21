import type { FlowApp } from './app';
import type { Register } from './index';
import type {
	AnyTransition,
	BranchContext,
	BranchRef,
	EffectRef,
	ExitRef,
	GotoRef,
	OverlaysInput,
	StepsInput,
	TargetKey,
	TransitionsFor,
} from './types';

export type FlowDef<N extends string = string, S extends StepsInput = StepsInput, O extends OverlaysInput = OverlaysInput> = {
	readonly kind: 'flow';
	readonly name: N;
	readonly baseUrl?: string;
	readonly steps: S;
	readonly overlays: O;
	/** @internal transições registadas por `transitions()`. */
	readonly _transitions: Record<string, Record<string, AnyTransition>>;
	/**
	 * Regista as transições do flow.
	 *
	 * É propositadamente um statement separado de `defineFlow` (e devolve `void`):
	 * assim o tipo do flow não depende dos `goto(...)`, o que evita a referência
	 * circular de tipos entre flows que se referem mutuamente via `Register`.
	 */
	transitions(map: TransitionsFor<S, O>): void;
};

export function defineFlow<const N extends string, const S extends StepsInput, const O extends OverlaysInput = {}>(def: {
	name: N;
	baseUrl?: string;
	steps: S;
	overlays?: O;
}): FlowDef<N, S, O> {
	const transitions: Record<string, Record<string, AnyTransition>> = {};
	const overlays = (def.overlays ?? {}) as O;

	for (const name of Object.keys(overlays)) {
		if (name in def.steps) {
			throw new Error(`[react-flow-app] O overlay "${name}" tem o mesmo nome de um passo do flow "${def.name}"`);
		}
	}

	return {
		kind: 'flow',
		...def,
		overlays,
		_transitions: transitions,
		transitions(map) {
			for (const [step, actions] of Object.entries(map as Record<string, Record<string, AnyTransition>>)) {
				for (const [action, target] of Object.entries(actions ?? {})) {
					if (transitions[step]?.[action]) {
						throw new Error(`[react-flow-app] Transição duplicada: ${def.name}.${step}:${action}`);
					}
					(transitions[step] ??= {})[action] = target;
				}
			}
		},
	};
}

// ─── Registo global (Register) ────────────────────────────────────────────────

export type RegisteredApp = Register extends { app: infer A } ? A : FlowApp;

export type RegisteredFlows = RegisteredApp extends FlowApp<infer F> ? F[number] : FlowDef;

export type RegisteredFlowName = RegisteredFlows['name'];

export type StepNameOf<F> = F extends FlowDef<string, infer S> ? keyof S & string : never;

/**
 * Mapa nome → flow, calculado uma vez (não é genérico, o TS guarda-o em cache).
 * Um `Extract<RegisteredFlows, { name: N }>` por chamada de `goto` seria O(flows) em cada
 * chamada, o que dá crescimento quadrático numa app grande.
 */
type RegisteredFlowMap = { [F in RegisteredFlows as F['name']]: F };

export type FlowByName<N extends string> = N extends keyof RegisteredFlowMap ? RegisteredFlowMap[N] : never;

function gotoFn<const F extends RegisteredFlowName, const S extends StepNameOf<FlowByName<F>> = never>(
	flow: F,
	step?: S
): GotoRef<F, S> {
	return step === undefined ? { kind: 'goto', flow } : { kind: 'goto', flow, step };
}

/**
 * Destino noutro flow, validado por nome contra o `Register`
 * (sem importar o outro flow → sem imports circulares).
 * Sem passo, retoma o flow no último passo onde esteve (v2: `navigateTo()` sem passo).
 */
export const goto = Object.assign(gotoFn, {
	/** Volta ao passo que abriu o flow atual (equivalente ao `fromFlow` da v2). */
	exit: (): ExitRef => ({ kind: 'exit' }),
});

/** Ação só com efeito (sem navegação): analytics, abrir um link externo, etc. */
export function effect<P>(run: (ctx: BranchContext, payload: P) => void): EffectRef<P> {
	return { kind: 'effect', run };
}

/**
 * Transição condicional com destinos declarados: o diagrama mostra todos os
 * `targets` sem executar o `resolve`.
 */
export function branch<const T extends readonly unknown[], P>(
	targets: T,
	resolve: (ctx: BranchContext, payload: P) => T[number],
	options: {
		/**
		 * Payload de exemplo por alvo, usado pelos testes gerados (`getPaths`) para percorrer
		 * cada ramo. `NoInfer`: o tipo do payload vem da ação, não dos exemplos.
		 */
		samples?: { readonly [K in TargetKey<T[number]>]?: NoInfer<P> };
	} = {}
): BranchRef<T[number], P> {
	return { kind: 'branch', targets, resolve, samples: options.samples as BranchRef<T[number], P>['samples'] };
}
