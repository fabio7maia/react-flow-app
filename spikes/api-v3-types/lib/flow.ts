import type { FlowApp } from './app';
import type { Register } from './index';
import type {
	AnyTransition,
	BranchContext,
	BranchRef,
	ExitRef,
	GotoRef,
	StepsInput,
	TransitionsFor,
} from './types';

export type FlowDef<N extends string = string, S extends StepsInput = StepsInput> = {
	readonly kind: 'flow';
	readonly name: N;
	readonly baseUrl?: string;
	readonly steps: S;
	/** @internal transições registadas por `transitions()`. */
	readonly _transitions: Record<string, Record<string, AnyTransition>>;
	/**
	 * Regista as transições do flow.
	 *
	 * É propositadamente um statement separado de `defineFlow` (e devolve `void`):
	 * assim o tipo do flow não depende dos `goto(...)`, o que evita a referência
	 * circular de tipos entre flows que se referem mutuamente via `Register`.
	 */
	transitions(map: TransitionsFor<S>): void;
};

export function defineFlow<const N extends string, const S extends StepsInput>(def: {
	name: N;
	baseUrl?: string;
	steps: S;
}): FlowDef<N, S> {
	const transitions: Record<string, Record<string, AnyTransition>> = {};

	return {
		kind: 'flow',
		...def,
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

export type FlowByName<N extends string> = Extract<RegisteredFlows, { name: N }>;

function gotoFn<const F extends RegisteredFlowName, const S extends StepNameOf<FlowByName<F>>>(
	flow: F,
	step: S
): GotoRef<F, S> {
	return { kind: 'goto', flow, step };
}

/**
 * Destino noutro flow, validado por nome contra o `Register`
 * (sem importar o outro flow → sem imports circulares).
 */
export const goto = Object.assign(gotoFn, {
	/** Volta ao passo que abriu o flow atual (equivalente ao `fromFlow` da v2). */
	exit: (): ExitRef => ({ kind: 'exit' }),
});

/**
 * Transição condicional com destinos declarados: o diagrama mostra todos os
 * `targets` sem executar o `resolve`.
 */
export function branch<const T extends readonly unknown[], P>(
	targets: T,
	resolve: (ctx: BranchContext, payload: P) => T[number]
): BranchRef<T[number], P> {
	return { kind: 'branch', targets, resolve };
}
