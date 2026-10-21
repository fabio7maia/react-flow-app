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
import type { FlowAdapter } from './adapters';
import { createFlowEngine, type FlowEngine, type FlowSnapshot } from './engine';
import type { FlowByName, RegisteredApp, RegisteredFlowName, StepNameOf } from './flow';
import type { StepParams } from './url';
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

/** Corre depois de o ecrã (lazy) estar de facto montado: o Suspense só o monta com o ecrã resolvido. */
function ScreenReady({ stepKey, onReady }: { stepKey: string; onReady: () => void }): null {
	useEffect(onReady, [stepKey]);
	return null;
}

/**
 * Cada Provider tem o seu próprio engine (sem singletons partilhados).
 * Os adaptadores (URL, scroll…) são opcionais: sem eles, o engine não toca no DOM.
 */
export function FlowProvider({
	app,
	initial,
	adapters = [],
	fallback = null,
	children,
}: {
	app: RegisteredApp;
	initial: { flow: RegisteredFlowName; step?: string };
	adapters?: FlowAdapter[];
	fallback?: ReactNode;
	/** Renderizado dentro do contexto do flow, depois do ecrã (ex.: analytics, layout). */
	children?: ReactNode;
}) {
	const [engine] = useState(() => {
		// Um deep link (adaptador) tem prioridade sobre o passo inicial declarado.
		const fromPlatform = adapters.map(adapter => adapter.initial?.(app as never)).find(Boolean);
		return createFlowEngine(app as never, { initial: (fromPlatform ?? initial) as never, deferStartEvents: true });
	});
	const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
	const screen = snapshot.flow && snapshot.step ? app.getFlow(snapshot.flow)?.steps[snapshot.step]?.screen : undefined;
	const Screen = screen ? lazyFor(screen) : null;

	useEffect(() => {
		const detach = adapters.map(adapter => adapter.attach(engine as FlowEngine));
		// Os efeitos dos filhos (ex.: useFlowEvents) já correram: agora ninguém perde o arranque.
		engine.releaseStartEvents();
		return () => detach.forEach(fn => fn());
		// Os adaptadores ligam-se uma vez por engine.
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

/** Re-renderiza apenas quando o valor selecionado muda. */
export function useFlowSelector<T>(selector: (snapshot: FlowSnapshot) => T): T {
	const engine = useEngine();
	return useSyncExternalStore(engine.subscribe, () => selector(engine.getSnapshot()));
}

/**
 * Parâmetros de URL do passo, tipados pelo padrão declarado no flow:
 * `useStepParams('checkout', 'payment')` → `{ orderId: string }`.
 */
export function useStepParams<N extends RegisteredFlowName, S extends StepNameOf<FlowByName<N>>>(
	_flow: N,
	_step: S
): StepParams<FlowByName<N>, S> {
	return useFlowSelector(snapshot => snapshot.params) as StepParams<FlowByName<N>, S>;
}

/** Tipado a partir da definição do ecrã: não depende de flows nem do registo. */
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
