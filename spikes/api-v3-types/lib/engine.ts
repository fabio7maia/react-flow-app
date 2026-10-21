import type { FlowApp, FlowEvent, FlowEventType } from './app';
import type { FlowDef, StepNameOf } from './flow';
import { edgeKey, targetKey, toGraph } from './graph';
import type { AnyTransition, HistoryEntry, StepInput } from './types';

export type FlowSnapshot = {
	readonly flow: string | null;
	readonly step: string | null;
	/** Passos anteriores (não inclui o atual). */
	readonly history: readonly HistoryEntry[];
	/** Passos que abriram flows (para `goto.exit()`). */
	readonly callers: readonly HistoryEntry[];
};

type Flows<A> = A extends FlowApp<infer F> ? F[number] : FlowDef;

type EventOf<A, T> = Extract<FlowEvent<Flows<A>>, { type: T }>;

export type FlowEngine<A extends FlowApp = FlowApp> = {
	getSnapshot(): FlowSnapshot;
	subscribe(cb: () => void): () => void;
	on<T extends FlowEventType>(type: T | '*', cb: (event: EventOf<A, T>) => void): () => void;
	start<N extends Flows<A>['name']>(flow: N, step?: StepNameOf<Extract<Flows<A>, { name: N }>>): void;
	dispatch(action: string, payload?: unknown): void;
	back(): void;
	/** Cobertura de transições exercidas por esta instância (para testes). */
	coverage(): { ratio: number; covered: string[]; missing: string[] };
};

const same = (a: HistoryEntry, b: HistoryEntry): boolean => a.flow === b.flow && a.step === b.step;

export function createFlowEngine<A extends FlowApp>(
	app: A,
	options: { initial?: { flow: Flows<A>['name']; step?: string } } = {}
): FlowEngine<A> {
	let state: FlowSnapshot = { flow: null, step: null, history: [], callers: [] };
	let navigationId = 0;
	const subscribers = new Set<() => void>();
	const listeners = new Map<string, Set<(event: any) => void>>();
	const traversed = new Set<string>();

	const stepOf = (entry: HistoryEntry): StepInput => {
		const step = app.getFlow(entry.flow)?.steps[entry.step];
		if (!step) {
			throw new Error(`[react-flow-app] Passo inexistente: ${entry.flow}.${entry.step}`);
		}
		return step;
	};

	const emit = (event: Record<string, unknown>): void => {
		const full = { ...event, navigationId, timestamp: Date.now() };
		const targets: Array<(event: never) => void> = [
			...(listeners.get(event.type as string) ?? []),
			...(listeners.get('*') ?? []),
			...(app.options.integrations ?? []),
		];
		for (const cb of targets) {
			try {
				cb(full as never);
			} catch (error) {
				// Uma integração com erro não pode partir a navegação nem as outras integrações.
				console.error('[react-flow-app] Erro numa integração', error);
			}
		}
	};

	const commit = (next: FlowSnapshot): void => {
		state = next;
		subscribers.forEach(cb => cb());
	};

	const current = (): HistoryEntry | null => (state.flow && state.step ? { flow: state.flow, step: state.step } : null);

	const enter = (
		target: HistoryEntry,
		next: Omit<FlowSnapshot, 'flow' | 'step'>,
		ctx: { from: HistoryEntry | null; direction: 'forward' | 'back'; source?: 'initial' | 'api' | 'goto' }
	): void => {
		if (!ctx.from || ctx.from.flow !== target.flow) {
			emit({ type: 'flow:start', ...target, source: ctx.source ?? 'goto' });
		}
		commit({ ...next, ...target });
		emit({
			type: 'step:enter',
			...target,
			direction: ctx.direction,
			from: ctx.from ?? undefined,
			meta: stepOf(target).screen.meta,
		});
	};

	const forward = (target: HistoryEntry, reason: 'dispatch' | 'start', source?: 'api' | 'goto'): void => {
		const from = current();
		let history = [...state.history];
		let callers = [...state.callers];

		if (from) {
			emit({ type: 'step:leave', ...from, reason });
			if (!stepOf(from).ignoreHistory) {
				history.push(from);
			}
			if (from.flow !== target.flow) {
				callers.push(from);
			}
		}

		const targetStep = stepOf(target);
		const existing = history.findIndex(entry => same(entry, target));

		if (existing >= 0 && !targetStep.allowCyclicHistory) {
			history = history.slice(0, existing);
		}
		if (targetStep.clearHistory) {
			history = [];
			callers = [];
		}

		enter(target, { history, callers }, { from, direction: 'forward', source });
	};

	const exitFlow = (reason: 'exit' | 'back'): void => {
		const from = current();
		if (!from) return;

		emit({ type: 'flow:exit', ...from, reason });

		const caller = state.callers[state.callers.length - 1];
		if (!caller) return;

		emit({ type: 'step:leave', ...from, reason: 'exit' });
		const index = state.history.map(entry => same(entry, caller)).lastIndexOf(true);
		const history = index >= 0 ? state.history.slice(0, index) : state.history;
		enter(caller, { history, callers: state.callers.slice(0, -1) }, { from, direction: 'back' });
	};

	const resolve = (
		transition: AnyTransition,
		from: HistoryEntry,
		payload: unknown
	): { target: HistoryEntry | 'exit'; key: string } => {
		if (typeof transition === 'string') {
			return { target: { flow: from.flow, step: transition }, key: targetKey(transition) };
		}
		switch (transition.kind) {
			case 'goto':
				return { target: { flow: transition.flow, step: transition.step }, key: targetKey(transition) };
			case 'exit':
				return { target: 'exit', key: targetKey(transition) };
			case 'branch': {
				const chosen = transition.resolve({ ...from, history: state.history }, payload) as AnyTransition;
				const allowed = transition.targets.map(t => targetKey(t as AnyTransition));
				if (!allowed.includes(targetKey(chosen))) {
					throw new Error(
						`[react-flow-app] branch em ${from.flow}.${from.step} devolveu "${targetKey(chosen)}", que não está em [${allowed}]`
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
		start(flowName, stepName) {
			const flow = app.getFlow(flowName);
			if (!flow) throw new Error(`[react-flow-app] Flow inexistente: ${flowName}`);

			navigationId++;
			const step =
				stepName ??
				Object.entries(flow.steps).find(([, opts]) => opts.initial)?.[0] ??
				Object.keys(flow.steps)[0];
			const target = { flow: flow.name, step };

			if (current()) {
				forward(target, 'start', 'api');
			} else {
				enter(target, { history: [], callers: [] }, { from: null, direction: 'forward', source: 'initial' });
			}
		},
		dispatch(action, payload) {
			const from = current();
			if (!from) {
				console.warn('[react-flow-app] dispatch sem flow ativo');
				return;
			}

			navigationId++;
			const transition = app.getFlow(from.flow)?._transitions[from.step]?.[action];

			if (!transition) {
				emit({ type: 'action:unhandled', ...from, action });
				return;
			}

			emit({ type: 'action', ...from, action, payload });

			const { target, key } = resolve(transition, from, payload);
			traversed.add(edgeKey(from.flow, from.step, action, key));

			if (target === 'exit') {
				exitFlow('exit');
			} else {
				forward(target, 'dispatch', target.flow !== from.flow ? 'goto' : undefined);
			}
		},
		back() {
			const from = current();
			if (!from) return;

			navigationId++;
			const previous = state.history[state.history.length - 1];

			if (!previous) {
				// Equivalente ao backExit da v2: a app decide (fechar webview, sair…).
				exitFlow('back');
				return;
			}

			emit({ type: 'step:leave', ...from, reason: 'back' });
			const callers = state.callers;
			const last = callers[callers.length - 1];
			enter(
				previous,
				{
					history: state.history.slice(0, -1),
					callers: last && same(last, previous) ? callers.slice(0, -1) : callers,
				},
				{ from, direction: 'back' }
			);
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

	if (options.initial) {
		engine.start(options.initial.flow, options.initial.step as never);
	}

	return engine;
}
