import { useSyncExternalStore } from 'react';
import type { FlowEngine, FlowEvent, FlowSnapshot } from 'react-flow-app';

/** O que os painéis da demo mostram. Alimentado pelo `DevtoolsBridge`, dentro do FlowProvider. */
export type LogEntry =
	| { kind: 'event'; event: FlowEvent; doc: number }
	| { kind: 'load'; doc: number; url: string };

export type AnalyticsCall = { id: number; method: 'page' | 'track'; name: string; properties?: Record<string, unknown> };

type State = {
	log: LogEntry[];
	analytics: AnalyticsCall[];
	snapshot: FlowSnapshot | null;
	covered: string[];
	engine: FlowEngine | null;
	/** Última transição percorrida (para a destacar no diagrama). */
	lastEdge: { from: string; action: string; to: string } | null;
};

let state: State = { log: [], analytics: [], snapshot: null, covered: [], engine: null, lastEdge: null };
const subscribers = new Set<() => void>();
let analyticsId = 0;
const MAX_LOG = 300;

const set = (patch: Partial<State>): void => {
	state = { ...state, ...patch };
	subscribers.forEach(cb => cb());
};

/** Ação em curso por navegação, para ligar `action` → `step:enter` numa aresta. */
let pendingAction: { navigationId: number; from: string; action: string } | null = null;

export const devtools = {
	attach(engine: FlowEngine, doc: number, url: string): void {
		set({
			engine,
			snapshot: engine.getSnapshot(),
			covered: engine.coverage().covered,
			lastEdge: null,
			log: [...state.log, { kind: 'load' as const, doc, url }].slice(-MAX_LOG),
		});
	},
	event(event: FlowEvent, doc: number): void {
		const engine = state.engine;
		let lastEdge = state.lastEdge;
		if (event.type === 'action') {
			pendingAction = { navigationId: event.navigationId, from: `${event.flow}.${event.step}`, action: event.action };
		}
		if (event.type === 'step:enter') {
			lastEdge =
				pendingAction && pendingAction.navigationId === event.navigationId
					? { from: pendingAction.from, action: pendingAction.action, to: `${event.flow}.${event.step}` }
					: null;
		}
		set({
			log: [...state.log, { kind: 'event' as const, event, doc }].slice(-MAX_LOG),
			snapshot: engine?.getSnapshot() ?? state.snapshot,
			covered: engine?.coverage().covered ?? state.covered,
			lastEdge,
		});
	},
	analytics(method: 'page' | 'track', name: string, properties?: Record<string, unknown>): void {
		set({ analytics: [...state.analytics, { id: ++analyticsId, method, name, properties }].slice(-MAX_LOG) });
	},
	clear(): void {
		set({ log: [], analytics: [] });
	},
	get engine(): FlowEngine | null {
		return state.engine;
	},
};

const subscribe = (cb: () => void): (() => void) => {
	subscribers.add(cb);
	return () => subscribers.delete(cb);
};

export function useDevtools(): State {
	return useSyncExternalStore(subscribe, () => state);
}
