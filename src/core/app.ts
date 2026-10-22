import type { FlowDef, RegisteredFlows } from './flow';
import type { RegisteredMeta, ScreenActions } from './types';

// ─── Event contract (v1) ──────────────────────────────────────────────────────
//
// Designed for type-check performance: the union has ONE member per event type and ONE member
// per action name (not per flow × step × action). With 300 screens, the "cartesian product"
// version took the check from 1.5 s to 8.6 s. `flow` and `step` are plain unions (not correlated
// with each other); the payload stays correlated with the action, which is what integrations need.

type EventBase = {
	/** Shared by every event of one navigation, strictly increasing between navigations. */
	readonly navigationId: number;
	readonly timestamp: number;
	/** URL of the step the event refers to (`/baseUrl/url`, with its params). Handy for page views. */
	readonly url: string;
};

type FlowNameOf<F> = F extends FlowDef<infer N> ? N : never;
type StepNameOfAny<F> = F extends FlowDef<string, infer S> ? keyof S & string : never;
type ScreensOf<F> = F extends FlowDef<string, infer S, infer O> ? S[keyof S]['screen'] | O[keyof O] : never;

type ActionPairs<Sc> = Sc extends unknown
	? { [A in keyof ScreenActions<Sc> & string]: [A, ScreenActions<Sc>[A]] }[keyof ScreenActions<Sc> & string]
	: never;

/**
 * `{ pay: { ok: boolean }; cancel: undefined; ... }` across every screen of the flows. A mapped
 * type with `as`: repeated keys (the same action on several screens) merge their payloads into a
 * union in one pass (one `Extract` per action would be quadratic).
 */
export type ActionPayloads<F> = { [P in ActionPairs<ScreensOf<F>> as P[0]]: P[1] };

type Where<F> = { flow: FlowNameOf<F>; step: StepNameOfAny<F> };

// Every event has its own named type: code that needs only one (e.g. analytics) does not pay for
// an `Extract` over the whole union, which cost ~1.5M instantiations per use with 1000 actions.
export type FlowStartEvent<F = FlowDef> = Where<F> & EventBase & { type: 'flow:start'; source: 'initial' | 'api' | 'goto' | 'back' };
export type StepLeaveEvent<F = FlowDef> = Where<F> & EventBase & { type: 'step:leave'; reason: 'dispatch' | 'back' | 'exit' | 'start' };
export type StepEnterEvent<F = FlowDef> = Where<F> &
	EventBase & {
		type: 'step:enter';
		direction: 'forward' | 'back';
		from?: { flow: string; step: string };
		meta?: RegisteredMeta;
	};
/** The flow is no longer active. */
export type FlowExitEvent<F = FlowDef> = Where<F> & EventBase & { type: 'flow:exit'; reason: 'exit' | 'back' | 'goto' | 'start' };
/** `back()` without history: there is nowhere to go back to. */
export type BackEmptyEvent<F = FlowDef> = Where<F> & EventBase & { type: 'back:empty' };
export type ActionUnhandledEvent<F = FlowDef> = Where<F> & EventBase & { type: 'action:unhandled'; action: string };

export type ActionEvent<F = FlowDef> = {
	[A in keyof ActionPayloads<F>]: Where<F> & EventBase & { type: 'action'; action: A; payload: ActionPayloads<F>[A]; overlay?: string };
}[keyof ActionPayloads<F>];

/** Discriminated union of every event a set of flows can emit. */
export type FlowEvent<F = FlowDef> =
	| FlowStartEvent<F>
	| StepLeaveEvent<F>
	| StepEnterEvent<F>
	| FlowExitEvent<F>
	| BackEmptyEvent<F>
	| ActionUnhandledEvent<F>
	| ActionEvent<F>;

export type FlowEventType = FlowEvent['type'];

export type RegisteredEvent = FlowEvent<RegisteredFlows>;

// ─── App ──────────────────────────────────────────────────────────────────────

export type FlowAppOptions<F extends readonly FlowDef[]> = {
	/** Integrations (logging, monitoring…) that receive every event of every instance. */
	integrations?: ReadonlyArray<(event: FlowEvent<F[number]>) => void>;
};

/** The app definition: data only, no state. State lives in each engine (one per Provider). */
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
			throw new Error(`[react-flow-app] Duplicate flow: ${flow.name}`);
		}
		byName.set(flow.name, flow);
	}

	return { kind: 'app', flows, options, getFlow: name => byName.get(name) };
}
