import {
	type ComponentType,
	createContext,
	Fragment,
	lazy,
	type LazyExoticComponent,
	type ReactNode,
	Suspense,
	useContext,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import {
	type ActionName,
	createFlowEngine,
	type DispatchArgs,
	type FlowAdapter,
	type FlowByName,
	type FlowEngine,
	type FlowEventType,
	type FlowParams,
	type FlowSnapshot,
	type HistoryEntry,
	type RegisteredApp,
	type RegisteredEvent,
	type RegisteredFlowName,
	type ScreenActions,
	type ScreenDef,
	type StepNameOf,
	type StepParams,
} from 'react-flow-app';

const EngineContext = createContext<FlowEngine | null>(null);

/** The step a screen belongs to: with `keepPreviousMounted`, hidden screens keep their own params. */
type MountedStep = { key: string; flow: string; step: string; params: FlowParams; current: boolean };
const StepContext = createContext<MountedStep | null>(null);

const HIDDEN = { display: 'none' } as const;
const VISIBLE = { display: 'contents' } as const;

/**
 * Screens to keep mounted: the current one and, walking back through the history of the same
 * flow, each previous step while the step after it has `keepPreviousMounted`. Derived from the
 * snapshot, so back, clearHistory or a step without the option drop them naturally. Keys follow the
 * position in the history, so React keeps the same instance when a step is hidden or shown again.
 */
function mountedSteps(app: RegisteredApp, snapshot: FlowSnapshot): { steps: MountedStep[]; keeps: boolean } {
	const { flow, step, history, params } = snapshot;
	if (!flow || !step) return { steps: [], keeps: false };
	const steps = app.getFlow(flow)?.steps ?? {};
	const keeps = Object.values(steps).some(options => options.keepPreviousMounted);
	const list: MountedStep[] = [{ key: `${flow}.${step}#${history.length}`, flow, step, params, current: true }];
	if (!keeps) return { steps: list, keeps };

	let next = step;
	for (let index = history.length - 1; index >= 0; index--) {
		const entry: HistoryEntry = history[index];
		if (entry.flow !== flow || !steps[next]?.keepPreviousMounted) break;
		list.unshift({
			key: `${entry.flow}.${entry.step}#${index}`,
			flow: entry.flow,
			step: entry.step,
			params: entry.params ?? {},
			current: false,
		});
		next = entry.step;
	}
	return { steps: list, keeps };
}

const lazyScreens = new WeakMap<ScreenDef, LazyExoticComponent<ComponentType>>();

const lazyFor = (screen: ScreenDef): LazyExoticComponent<ComponentType> => {
	let component = lazyScreens.get(screen);
	if (!component) {
		component = lazy(async () => {
			const module = await screen.loader();
			if (typeof module.default !== 'function' && typeof module.default !== 'object') {
				throw new Error(`[react-flow-app] The loader of screen "${screen.name}" does not export a default component`);
			}
			return module as { default: ComponentType };
		});
		lazyScreens.set(screen, component);
	}
	return component;
};

function useEngine(): FlowEngine {
	const engine = useContext(EngineContext);
	if (!engine) {
		throw new Error('[react-flow-app] Hook used outside <FlowProvider>');
	}
	return engine;
}

/** Runs once the (lazy) screen is actually mounted: Suspense only mounts it when resolved. */
function ScreenReady({ stepKey, onReady }: { stepKey: string; onReady: () => void }): null {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(onReady, [stepKey]);
	return null;
}

export type FlowProviderProps = {
	app: RegisteredApp;
	/** Initial step; `history` lets back work from it (e.g. a deep link into the middle of a flow). */
	initial: { flow: RegisteredFlowName; step?: string; history?: ReadonlyArray<string | HistoryEntry> };
	/** Read on the first render only (they attach once per engine), like `initial`. */
	adapters?: FlowAdapter[];
	fallback?: ReactNode;
	/** Rendered inside the flow context, after the screen (e.g. analytics, layout). */
	children?: ReactNode;
};

/**
 * Each Provider has its own engine (no shared singletons). Adapters (URL, scroll…) are optional:
 * without them, the engine does not touch the DOM.
 */
export function FlowProvider({ app, initial, adapters: adaptersProp = [], fallback = null, children }: FlowProviderProps) {
	// Pinned: a parent that recreates the list on every render must not swap the adapters attached to the engine.
	const [adapters] = useState(adaptersProp);
	const [engine] = useState(() => {
		// A deep link (from an adapter) wins over the declared initial step.
		const fromPlatform = adapters.map(adapter => adapter.initial?.(app as never)).find(Boolean);
		return createFlowEngine(app as never, { initial: (fromPlatform ?? initial) as never, deferStartEvents: true });
	});
	const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
	const { steps, keeps } = mountedSteps(app, snapshot);
	const onReady = (): void => adapters.forEach(adapter => adapter.screenReady?.());

	useEffect(() => {
		const detach = adapters.map(adapter => adapter.attach(engine as FlowEngine));
		// The children's effects (e.g. useFlowEvents) already ran: nobody misses the start events now.
		engine.releaseStartEvents();
		return () => detach.forEach(fn => fn());
		// Adapters attach once per engine.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [engine]);

	return (
		<EngineContext.Provider value={engine as FlowEngine}>
			{steps.map(mounted => {
				const screen = app.getFlow(mounted.flow)?.steps[mounted.step]?.screen;
				if (!screen) return null;
				const Screen = lazyFor(screen);
				const content = (
					<StepContext.Provider value={mounted}>
						<Suspense fallback={mounted.current ? fallback : null}>
							<Screen />
							{mounted.current && <ScreenReady stepKey={mounted.key} onReady={onReady} />}
						</Suspense>
					</StepContext.Provider>
				);
				// Flows that keep screens mounted wrap every screen, so a screen keeps its place in the
				// tree (and its instance) when it becomes hidden. `display: contents` adds no box.
				return keeps ? (
					<div key={mounted.key} style={mounted.current ? VISIBLE : HIDDEN} data-flow-step={`${mounted.flow}.${mounted.step}`}>
						{content}
					</div>
				) : (
					<Fragment key="screen">{content}</Fragment>
				);
			})}
			{children}
		</EngineContext.Provider>
	);
}

/** The Provider's engine (for devtools and integrations that need more than events, such as coverage). */
export function useFlowEngine(): FlowEngine {
	return useEngine();
}

/** Re-renders only when the selected value changes. */
export function useFlowSelector<T>(selector: (snapshot: FlowSnapshot) => T): T {
	const engine = useEngine();
	return useSyncExternalStore(engine.subscribe, () => selector(engine.getSnapshot()));
}

/**
 * URL params of a step, typed from the pattern declared in the flow:
 * `useStepParams('checkout', 'payment')` → `{ orderId: string }`.
 */
export function useStepParams<N extends RegisteredFlowName, S extends StepNameOf<FlowByName<N>>>(
	_flow: N,
	_step: S
): StepParams<FlowByName<N>, S> {
	const mounted = useContext(StepContext);
	const live = useFlowSelector(snapshot => snapshot.params);
	// A screen kept mounted under another step reads its own params, not the current step's.
	return (mounted && !mounted.current ? mounted.params : live) as StepParams<FlowByName<N>, S>;
}

/** Typed from the screen definition: it depends neither on flows nor on the registration. */
export function useFlow<S extends ScreenDef>(screen: S) {
	const engine = useEngine();
	const canGoBack = useFlowSelector(snapshot => snapshot.history.length > 0);

	return {
		dispatch: <K extends ActionName<S>>(...[action, payload, options]: DispatchArgs<ScreenActions<S>, K>): void =>
			engine.dispatch(action, payload, { ...options, from: screen.name }),
		back: (): void => engine.back(),
		canGoBack,
	};
}

/** Events typed by `Register` (every action and payload of every flow). */
export function useFlowEvents<T extends FlowEventType>(
	type: T | '*',
	callback: (event: Extract<RegisteredEvent, { type: T }>) => void
): void {
	const engine = useEngine();
	const ref = useRef(callback);
	ref.current = callback;

	useEffect(() => engine.on(type as never, event => ref.current(event as never)), [engine, type]);
}
