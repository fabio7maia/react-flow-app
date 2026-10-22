import type { FlowApp, FlowEvent, FlowEventType } from './app';
import type { FlowDef, StepNameOf } from './flow';
import { edgeKey, targetKey, toGraph } from './graph';
import type { AnyTransition, HistoryEntry, StepInput } from './types';
import { buildUrl, type FlowParams, type StepParams } from './url';

export type FlowSnapshot = {
	readonly flow: string | null;
	readonly step: string | null;
	/** Previous steps (the current one is not included). */
	readonly history: readonly HistoryEntry[];
	/** Steps that opened flows (for `goto.exit()`). */
	readonly callers: readonly HistoryEntry[];
	/** URL params of the current step. */
	readonly params: FlowParams;
};

/** History options of an imperative navigation. */
export type NavigationOptions = {
	/** Do not keep the current step in the history. */
	ignoreHistory?: boolean;
	/** Clear the history and forget the flow that opened the current one. */
	clearHistory?: boolean;
	/** Replace the history. Strings are steps of the target flow. */
	history?: ReadonlyArray<string | HistoryEntry>;
	/**
	 * URL params of the target step (e.g. `{ orderId: '42' }` for `pay/:orderId`). Without them,
	 * the step keeps the params of its last visit.
	 */
	params?: FlowParams;
};

type Flows<A> = A extends FlowApp<infer F> ? F[number] : FlowDef;

type EventOf<A, T> = Extract<FlowEvent<Flows<A>>, { type: T }>;

export type FlowEngine<A extends FlowApp = FlowApp> = {
	getSnapshot(): FlowSnapshot;
	subscribe(cb: () => void): () => void;
	on<T extends FlowEventType>(type: T | '*', cb: (event: EventOf<A, T>) => void): () => void;
	start<N extends Flows<A>['name'], S extends StepNameOf<Extract<Flows<A>, { name: N }>> = never>(
		flow: N,
		step?: S,
		options?: Omit<NavigationOptions, 'ignoreHistory' | 'params'> & {
			/** Typed from the URL of the step: `pay/:orderId` → `{ orderId: string }`. */
			params?: StepParams<Extract<Flows<A>, { name: N }>, S>;
		}
	): void;
	/** `from`: name of the screen that dispatched (for overlay actions). `useFlow` fills it in. */
	dispatch(action: string, payload?: unknown, options?: Pick<NavigationOptions, 'ignoreHistory' | 'params'> & { from?: string }): void;
	back(): void;
	clearHistory(): void;
	/** URL of a step (with the current params by default). */
	urlOf<N extends Flows<A>['name'], S extends StepNameOf<Extract<Flows<A>, { name: N }>>>(
		entry: { flow: N; step: S },
		params?: StepParams<Extract<Flows<A>, { name: N }>, S>
	): string;
	/** Emits the start events held by `deferStartEvents` (see FlowProvider). */
	releaseStartEvents(): void;
	/** Transitions exercised by this instance (for tests). */
	coverage(): { ratio: number; covered: string[]; missing: string[] };
};

export type FlowEngineOptions<A extends FlowApp> = {
	initial?: {
		flow: Flows<A>['name'];
		step?: string;
		history?: ReadonlyArray<string | HistoryEntry>;
		params?: FlowParams;
	};
	/**
	 * Holds the start events until `releaseStartEvents()`. The initial state is available right
	 * away (synchronous first render), but listeners registered in component effects (e.g.
	 * analytics) no longer miss the first `step:enter`.
	 */
	deferStartEvents?: boolean;
};

const same = (a: HistoryEntry, b: HistoryEntry): boolean => a.flow === b.flow && a.step === b.step;

export function createFlowEngine<A extends FlowApp>(app: A, options: FlowEngineOptions<A> = {}): FlowEngine<A> {
	let state: FlowSnapshot = { flow: null, step: null, history: [], callers: [], params: {} };
	let navigationId = 0;
	const subscribers = new Set<() => void>();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const listeners = new Map<string, Set<(event: any) => void>>();
	const traversed = new Set<string>();
	let held: Array<Record<string, unknown>> | null = options.deferStartEvents ? [] : null;
	/** Last step of each flow, to resume with `goto(flow)` / `start(flow)` without a step. */
	const lastStep = new Map<string, string>();
	/**
	 * Params of the last visit to each step: a transition without `params` (e.g. `retry` from the
	 * failure step back to payment) keeps the step's params instead of leaving `:orderId` unfilled.
	 */
	const lastParams = new Map<string, FlowParams>();
	/** Run-to-completion: navigations requested by a listener run after the current one ends. */
	let navigating = false;
	const pending: Array<() => void> = [];

	const initialStepOf = (flowName: string): string => {
		const flow = app.getFlow(flowName);
		if (!flow) throw new Error(`[react-flow-app] Unknown flow: ${flowName}`);
		const entries = Object.entries(flow.steps);
		return entries.find(([, opts]) => opts.initial)?.[0] ?? entries[0][0];
	};

	const resumeStepOf = (flowName: string): string => lastStep.get(flowName) ?? initialStepOf(flowName);

	const stepOf = (entry: HistoryEntry): StepInput => {
		const step = app.getFlow(entry.flow)?.steps[entry.step];
		if (!step) {
			throw new Error(`[react-flow-app] Unknown step: ${entry.flow}.${entry.step}`);
		}
		return step;
	};

	const emit = (event: Record<string, unknown>): void => {
		const entry = { flow: event.flow as string, step: event.step as string };
		const url = app.getFlow(entry.flow)?.steps[entry.step] ? buildUrl(app, entry, state.params) : '';
		const full = { ...event, navigationId, timestamp: Date.now(), url };
		if (held) {
			held.push(full);
			return;
		}
		deliver(full);
	};

	// Delivery order: listeners of the type, then '*', then the app integrations.
	const deliver = (full: Record<string, unknown>): void => {
		const targets: Array<(event: never) => void> = [
			...(listeners.get(full.type as string) ?? []),
			...(listeners.get('*') ?? []),
			...(app.options.integrations ?? []),
		];
		for (const cb of targets) {
			try {
				cb(full as never);
			} catch (error) {
				// A failing integration must not break the navigation or the other integrations.
				console.error('[react-flow-app] Error in an event listener', error);
			}
		}
	};

	/**
	 * A navigation delivers all of its events before the next one starts. Without this, a listener
	 * that navigates (e.g. a redirect on `step:enter`) would interleave the events of two
	 * navigations and mix their `navigationId`s.
	 */
	const navigate = (run: () => void): void => {
		if (navigating) {
			pending.push(run);
			return;
		}
		navigating = true;
		try {
			run();
			for (let next = pending.shift(); next; next = pending.shift()) next();
		} finally {
			navigating = false;
			pending.length = 0;
		}
	};

	const commit = (next: FlowSnapshot): void => {
		state = next;
		subscribers.forEach(cb => cb());
	};

	const current = (): HistoryEntry | null => (state.flow && state.step ? { flow: state.flow, step: state.step } : null);

	const toEntries = (flow: string, history: ReadonlyArray<string | HistoryEntry>): HistoryEntry[] =>
		history.map(entry => (typeof entry === 'string' ? { flow, step: entry } : entry));

	const enter = (
		target: HistoryEntry,
		next: Omit<FlowSnapshot, 'flow' | 'step'>,
		ctx: { from: HistoryEntry | null; direction: 'forward' | 'back'; source: 'initial' | 'api' | 'goto' | 'back' }
	): void => {
		// Commit first: the `url` of flow:start already carries the params of the target step.
		commit({ ...next, ...target });
		lastParams.set(`${target.flow}.${target.step}`, next.params);
		if (!ctx.from || ctx.from.flow !== target.flow) {
			emit({ type: 'flow:start', ...target, source: ctx.source });
		}
		lastStep.set(target.flow, target.step);
		emit({
			type: 'step:enter',
			...target,
			direction: ctx.direction,
			from: ctx.from ?? undefined,
			meta: stepOf(target).screen.meta,
		});
	};

	/** Leaves the current step and, when the flow changes, the current flow. */
	const leave = (from: HistoryEntry, to: HistoryEntry, reason: 'dispatch' | 'back' | 'exit' | 'start'): void => {
		emit({ type: 'step:leave', ...from, reason });
		if (from.flow !== to.flow) {
			const exitReason = reason === 'dispatch' ? 'goto' : reason;
			emit({ type: 'flow:exit', ...from, reason: exitReason });
		}
	};

	const forward = (
		target: HistoryEntry,
		reason: 'dispatch' | 'start',
		source: 'api' | 'goto',
		navigation: NavigationOptions = {}
	): void => {
		const origin = current();
		const from = origin && { ...origin, params: state.params };
		let history = [...state.history];
		let callers = [...state.callers];

		if (from) {
			leave(origin as HistoryEntry, target, reason);
			if (!stepOf(from).ignoreHistory && !navigation.ignoreHistory) {
				history.push(from);
			}
			if (from.flow !== target.flow) {
				callers.push(from);
			}
		}

		const targetStep = stepOf(target);
		const existing = history.findIndex(entry => same(entry, target));

		// As in v2: every step that shows up again in the history needs allowCyclicHistory.
		if (existing >= 0 && !targetStep.allowCyclicHistory) {
			history = history.slice(0, existing);
		}
		if (targetStep.clearHistory || navigation.clearHistory) {
			history = [];
			callers = [];
		}
		if (navigation.history) {
			history = toEntries(target.flow, navigation.history);
		}

		const params = navigation.params ?? lastParams.get(`${target.flow}.${target.step}`) ?? {};
		enter(target, { history, callers, params }, { from: origin, direction: 'forward', source });
	};

	const exitFlow = (): void => {
		const from = current();
		const caller = state.callers[state.callers.length - 1];
		if (!from || !caller) {
			console.warn('[react-flow-app] goto.exit() without a calling flow');
			return;
		}

		leave(from, caller, 'exit');
		const index = state.history.map(entry => same(entry, caller)).lastIndexOf(true);
		const history = index >= 0 ? state.history.slice(0, index) : state.history;
		enter(
			{ flow: caller.flow, step: caller.step },
			{ history, callers: state.callers.slice(0, -1), params: caller.params ?? {} },
			{ from, direction: 'back', source: 'back' }
		);
	};

	const resolve = (
		transition: AnyTransition,
		from: HistoryEntry,
		payload: unknown
	): { target: HistoryEntry | 'exit' | 'effect'; key: string } => {
		if (typeof transition === 'string') {
			return { target: { flow: from.flow, step: transition }, key: targetKey(transition) };
		}
		switch (transition.kind) {
			case 'goto':
				return {
					target: { flow: transition.flow, step: transition.step ?? resumeStepOf(transition.flow) },
					key: targetKey(transition),
				};
			case 'exit':
				return { target: 'exit', key: targetKey(transition) };
			case 'effect':
				transition.run({ ...from, history: state.history }, payload);
				return { target: 'effect', key: targetKey(transition) };
			case 'branch': {
				const chosen = transition.resolve({ ...from, history: state.history }, payload) as AnyTransition;
				const allowed = transition.targets.map(t => targetKey(t as AnyTransition));
				if (!allowed.includes(targetKey(chosen))) {
					throw new Error(
						`[react-flow-app] branch in ${from.flow}.${from.step} returned "${targetKey(chosen)}", which is not one of [${allowed}]`
					);
				}
				return resolve(chosen, from, payload);
			}
		}
	};

	const engine: FlowEngine<A> = {
		getSnapshot: () => state,
		subscribe(cb) {
			subscribers.add(cb);
			return () => subscribers.delete(cb);
		},
		on(type, cb) {
			const set = listeners.get(type) ?? new Set();
			listeners.set(type, set);
			set.add(cb);
			return () => set.delete(cb);
		},
		start(flowName, stepName, navigation = {}) {
			const flow = app.getFlow(flowName);
			if (!flow) throw new Error(`[react-flow-app] Unknown flow: ${flowName}`);
			navigate(() => startNow(flow.name, stepName, navigation));
		},
		dispatch(action, payload, navigation) {
			navigate(() => dispatchNow(action, payload, navigation));
		},
		back() {
			navigate(backNow);
		},
		clearHistory() {
			commit({ ...state, history: [], callers: [] });
		},
		releaseStartEvents() {
			const queue = held ?? [];
			held = null;
			navigate(() => queue.forEach(deliver));
		},
		urlOf(entry, params) {
			return buildUrl(app, entry, (params as FlowParams | undefined) ?? state.params);
		},
		coverage() {
			const all = [...new Set(toGraph(app).edges.map(edge => edge.key))];
			const covered = all.filter(key => traversed.has(key));
			return {
				ratio: all.length === 0 ? 1 : covered.length / all.length,
				covered,
				missing: all.filter(key => !traversed.has(key)),
			};
		},
	};

	function startNow(flowName: string, stepName: string | undefined, navigation: NavigationOptions): void {
		navigationId++;
		const target = { flow: flowName, step: stepName ?? resumeStepOf(flowName) };

		if (current()) {
			forward(target, 'start', 'api', navigation);
		} else {
			const history = navigation.history ? toEntries(flowName, navigation.history) : [];
			enter(
				target,
				{ history, callers: [], params: navigation.params ?? {} },
				{ from: null, direction: 'forward', source: 'initial' }
			);
		}
	}

	function dispatchNow(
		action: string,
		payload: unknown,
		navigation?: Pick<NavigationOptions, 'ignoreHistory' | 'params'> & { from?: string }
	): void {
		const from = current();
		if (!from) {
			console.warn('[react-flow-app] dispatch without an active flow');
			return;
		}

		navigationId++;
		const flow = app.getFlow(from.flow);
		// Actions of an overlay use the overlay's transitions; any other action uses the current step's.
		const overlay = Object.entries(flow?.overlays ?? {}).find(([, screen]) => screen.name === navigation?.from)?.[0];
		const transition = flow?._transitions[overlay ?? from.step]?.[action];

		if (!transition) {
			emit({ type: 'action:unhandled', ...from, action });
			return;
		}

		emit({ type: 'action', ...from, action, payload, overlay });

		const { target, key } = resolve(transition, from, payload);
		traversed.add(edgeKey(from.flow, overlay ? `@${overlay}` : from.step, action, key));

		if (target === 'exit') {
			exitFlow();
		} else if (target !== 'effect') {
			forward(target, 'dispatch', target.flow !== from.flow ? 'goto' : 'api', navigation);
		}
	}

	function backNow(): void {
		const from = current();
		if (!from) return;

		navigationId++;
		const previous = state.history[state.history.length - 1];

		if (!previous) {
			// The app can react to this (close a webview, leave…).
			emit({ type: 'back:empty', ...from });
			return;
		}

		leave(from, previous, 'back');
		const callers = state.callers;
		const last = callers[callers.length - 1];
		enter(
			{ flow: previous.flow, step: previous.step },
			{
				history: state.history.slice(0, -1),
				callers: last && same(last, previous) ? callers.slice(0, -1) : callers,
				params: previous.params ?? {},
			},
			{ from, direction: 'back', source: 'back' }
		);
	}

	if (options.initial) {
		const { flow, step, history, params } = options.initial;
		engine.start(flow, step as never, { history, params: params as never });
	}

	return engine;
}
