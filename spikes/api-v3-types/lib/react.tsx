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
import type { FlowEventType, RegisteredEvent } from './app';
import { createFlowEngine, type FlowEngine, type FlowSnapshot } from './engine';
import type { RegisteredApp, RegisteredFlowName } from './flow';
import type { ActionName, DispatchArgs, ScreenActions, ScreenDef } from './types';

const EngineContext = createContext<FlowEngine | null>(null);

const lazyScreens = new WeakMap<ScreenDef, LazyExoticComponent<ComponentType>>();

const lazyFor = (screen: ScreenDef): LazyExoticComponent<ComponentType> => {
	let component = lazyScreens.get(screen);
	if (!component) {
		component = lazy(async () => {
			const module = await screen.loader();
			if (typeof module.default !== 'function' && typeof module.default !== 'object') {
				throw new Error(`[react-flow-app] O loader do ecrã "${screen.name}" não exporta um componente por omissão`);
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
		throw new Error('[react-flow-app] Hook usado fora de <FlowProvider>');
	}
	return engine;
}

/** Cada Provider tem o seu próprio engine (sem singletons partilhados). */
export function FlowProvider({
	app,
	initial,
	fallback = null,
}: {
	app: RegisteredApp;
	initial: { flow: RegisteredFlowName; step?: string };
	fallback?: ReactNode;
}) {
	const [engine] = useState(() => createFlowEngine(app as never, { initial: initial as never }));
	const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
	const screen = snapshot.flow && snapshot.step ? app.getFlow(snapshot.flow)?.steps[snapshot.step]?.screen : undefined;
	const Screen = screen ? lazyFor(screen) : null;

	return (
		<EngineContext.Provider value={engine as FlowEngine}>
			{Screen && (
				<Suspense fallback={fallback}>
					<Screen />
				</Suspense>
			)}
		</EngineContext.Provider>
	);
}

/** Re-renderiza apenas quando o valor selecionado muda. */
export function useFlowSelector<T>(selector: (snapshot: FlowSnapshot) => T): T {
	const engine = useEngine();
	return useSyncExternalStore(engine.subscribe, () => selector(engine.getSnapshot()));
}

/** Tipado a partir da definição do ecrã: não depende de flows nem do registo. */
export function useFlow<S extends ScreenDef>(screen: S) {
	const engine = useEngine();
	const canGoBack = useFlowSelector(snapshot => snapshot.history.length > 0);

	return {
		dispatch: <K extends ActionName<S>>(...[action, payload]: DispatchArgs<ScreenActions<S>, K>): void =>
			engine.dispatch(action, payload, { from: screen.name }),
		back: (): void => engine.back(),
		canGoBack,
	};
}

/** Eventos tipados pelo `Register` (todas as ações e payloads de todos os flows). */
export function useFlowEvents<T extends FlowEventType>(
	type: T | '*',
	callback: (event: Extract<RegisteredEvent, { type: T }>) => void
): void {
	const engine = useEngine();
	const ref = useRef(callback);
	ref.current = callback;

	useEffect(() => engine.on(type as never, event => ref.current(event as never)), [engine, type]);
}
