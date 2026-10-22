import {
	type ComponentType,
	createContext,
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
	type FlowSnapshot,
	type RegisteredApp,
	type RegisteredEvent,
	type RegisteredFlowName,
	type ScreenActions,
	type ScreenDef,
	type StepNameOf,
	type StepParams,
} from 'react-flow-app';

const EngineContext = createContext<FlowEngine | null>(null);

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
	initial: { flow: RegisteredFlowName; step?: string };
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
	const screen = snapshot.flow && snapshot.step ? app.getFlow(snapshot.flow)?.steps[snapshot.step]?.screen : undefined;
	const Screen = screen ? lazyFor(screen) : null;

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
			{Screen && (
				<Suspense fallback={fallback}>
					<Screen />
					<ScreenReady
						stepKey={`${snapshot.flow}.${snapshot.step}#${snapshot.history.length}`}
						onReady={() => adapters.forEach(adapter => adapter.screenReady?.())}
					/>
				</Suspense>
			)}
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
	return useFlowSelector(snapshot => snapshot.params) as StepParams<FlowByName<N>, S>;
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
