import type { Register } from '../index';
import type { FlowApp } from './app';
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
	/** @internal Transitions registered by `transitions()`. */
	readonly _transitions: Record<string, Record<string, AnyTransition>>;
	/**
	 * Registers the transitions of the flow.
	 *
	 * It is deliberately a statement apart from `defineFlow` (and returns `void`): the type of the
	 * flow then does not depend on its `goto(...)` calls, which avoids circular types between flows
	 * that refer to each other through `Register`.
	 */
	transitions(map: TransitionsFor<S, O>): void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
			throw new Error(`[react-flow-app] Overlay "${name}" has the same name as a step of flow "${def.name}"`);
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
						throw new Error(`[react-flow-app] Duplicate transition: ${def.name}.${step}:${action}`);
					}
					(transitions[step] ??= {})[action] = target;
				}
			}
		},
	};
}

// ─── Global registration (Register) ───────────────────────────────────────────

export type RegisteredApp = Register extends { app: infer A } ? A : FlowApp;

export type RegisteredFlows = RegisteredApp extends FlowApp<infer F> ? F[number] : FlowDef;

export type RegisteredFlowName = RegisteredFlows['name'];

export type StepNameOf<F> = F extends FlowDef<string, infer S> ? keyof S & string : never;

/**
 * Name → flow map, computed once (it is not generic, so TypeScript caches it). An
 * `Extract<RegisteredFlows, { name: N }>` per `goto` call would be O(flows) per call, which grows
 * quadratically in a large app.
 */
type RegisteredFlowMap = { [F in RegisteredFlows as F['name']]: F };

export type FlowByName<N extends string> = N extends keyof RegisteredFlowMap ? RegisteredFlowMap[N] : never;

function gotoFn<const F extends RegisteredFlowName, const S extends StepNameOf<FlowByName<F>> = never>(flow: F, step?: S): GotoRef<F, S> {
	return step === undefined ? { kind: 'goto', flow } : { kind: 'goto', flow, step };
}

/**
 * Target in another flow, checked by name against `Register` (no import of the other flow, so no
 * circular imports). Without a step, resumes the flow at the last step it was in.
 */
export const goto = Object.assign(gotoFn, {
	/** Goes back to the step that opened the current flow. */
	exit: (): ExitRef => ({ kind: 'exit' }),
});

/** Action with a side effect only (no navigation): analytics, opening an external link, etc. */
export function effect<P>(run: (ctx: BranchContext, payload: P) => void): EffectRef<P> {
	return { kind: 'effect', run };
}

/**
 * Conditional transition with declared targets: the diagram shows every target without running
 * `resolve`.
 */
export function branch<const T extends readonly unknown[], P>(
	targets: T,
	resolve: (ctx: BranchContext, payload: P) => T[number],
	options: {
		/**
		 * Sample payload per target, used by generated tests (`getPaths`) to walk every branch.
		 * `NoInfer`: the payload type comes from the action, not from the samples.
		 */
		samples?: { readonly [K in TargetKey<T[number]>]?: NoInfer<P> };
	} = {}
): BranchRef<T[number], P> {
	return { kind: 'branch', targets, resolve, samples: options.samples as BranchRef<T[number], P>['samples'] };
}
