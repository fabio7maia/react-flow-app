import React, {
	createContext,
	lazy,
	Suspense,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import { extractGraph } from "../diagram/extractGraph";
import { FlowStore } from "../store/flowStore";
import type {
	FlowAppOptions,
	FlowDefinition,
	FlowDiagram,
	FlowState,
	HistoryEntry,
	InferActions,
	ListenCallback,
	ListenType,
	LoggerConfig,
	ScreenConfig,
	StepOptions,
	UseFlowManagerReturn,
	UseFlowReturn,
} from "../types/core";

// ─── Context ──────────────────────────────────────────────────────────────────

type FlowContextValue = {
	store: FlowStore;
	state: FlowState;
	options: FlowAppOptions;
};

// ─── Provider Props ───────────────────────────────────────────────────────────

type FlowProviderProps = {
	children: React.ReactNode;
	initialFlow?: string;
	initialStep?: string;
};

// ─── A11y Announcer ───────────────────────────────────────────────────────────

function A11yAnnouncer({ message }: { message: string }) {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-atomic="true"
			style={{
				position: "absolute",
				width: "1px",
				height: "1px",
				padding: 0,
				margin: "-1px",
				overflow: "hidden",
				clip: "rect(0,0,0,0)",
				whiteSpace: "nowrap",
				border: 0,
			}}
		>
			{message}
		</div>
	);
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

type ErrorBoundaryState = { hasError: boolean; error: Error | null };
type ErrorBoundaryProps = { children: React.ReactNode; fallback?: React.ReactNode };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<div role="alert" style={{ color: "red", padding: "1rem" }}>
						<strong>An error occurred.</strong> {this.state.error?.message ?? "Unknown error"}
					</div>
				)
			);
		}
		return this.props.children;
	}
}

// ─── Main factory ─────────────────────────────────────────────────────────────

type CreateFlowAppConfig<
	TScreens extends Record<string, ScreenConfig>,
	TFlows extends Record<string, FlowDefinition<TScreens>>,
> = {
	screens: TScreens;
	flows: TFlows;
	options?: FlowAppOptions;
	logger?: LoggerConfig;
};

type CreateFlowAppOutput<
	TScreens extends Record<string, ScreenConfig>,
	TFlows extends Record<string, FlowDefinition<TScreens>>,
> = {
	FlowProvider: React.FC<FlowProviderProps>;
	useFlow: <
		TScreen extends TScreens[keyof TScreens],
		TPayloads extends Partial<Record<InferActions<TScreen>, unknown>> = Partial<
			Record<InferActions<TScreen>, unknown>
		>,
	>(
		_screen: TScreen
	) => UseFlowReturn<TScreen, TPayloads>;
	useFlowManager: () => UseFlowManagerReturn<TFlows>;
	useFlowState: () => FlowState;
	useFlowHistory: () => HistoryEntry[];
	useFlowListener: (type: ListenType, callback: ListenCallback) => void;
	useFlowDiagram: () => FlowDiagram;
	getDiagram: () => FlowDiagram;
	store: FlowStore;
};

/**
 * Main factory function that creates a typed FlowProvider and hooks.
 *
 * @example
 * ```tsx
 * const { FlowProvider, useFlow, useFlowManager } = createFlowApp({
 *   screens,
 *   flows: { auth: authFlow, main: mainFlow },
 *   options: { withUrl: true, animation: true },
 * });
 * ```
 */
export function createFlowApp<
	TScreens extends Record<string, ScreenConfig>,
	TFlows extends Record<string, FlowDefinition<TScreens>>,
>(config: CreateFlowAppConfig<TScreens, TFlows>): CreateFlowAppOutput<TScreens, TFlows> {
	const { screens, flows, options = {} } = config;

	// Create the store (singleton per app instance)
	const store = new FlowStore(flows as Record<string, FlowDefinition>, screens);

	// Create React context
	const FlowContext = createContext<FlowContextValue | null>(null);

	function useFlowContext(): FlowContextValue {
		const ctx = useContext(FlowContext);
		if (!ctx) {
			throw new Error("[react-flow-app] Hook must be used inside <FlowProvider>");
		}
		return ctx;
	}

	// ─── FlowProvider ──────────────────────────────────────────────────────────

	const FlowProvider: React.FC<FlowProviderProps> = ({ children, initialFlow, initialStep }) => {
		const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

		// Start initial flow if provided
		const startedRef = useRef(false);
		useEffect(() => {
			if (!startedRef.current && initialFlow) {
				startedRef.current = true;
				store.start({ flowName: initialFlow, stepName: initialStep });
			}
		}, [initialFlow, initialStep]);

		// URL synchronization
		useEffect(() => {
			if (!options.withUrl) return;
			if (typeof window === "undefined") return;
			if (state.activeFlowName && state.activeStepName) {
				const flow = store.getFlows()[state.activeFlowName];
				const stepOpts = flow?.steps[state.activeStepName];
				const urlSegment = stepOpts?.url ?? state.activeStepName;
				const baseUrl = flow?.baseUrl ?? "";
				window.location.hash = `${baseUrl}/${urlSegment}`;
			}
		}, [state.activeFlowName, state.activeStepName]);

		const contextValue = useMemo<FlowContextValue>(() => ({ store, state, options }), [state]);

		// Get current step loader for rendering
		const loader = store.getCurrentLoader();
		const CurrentStep = useMemo(() => (loader ? lazy(loader) : null), [loader]);

		// A11y announcement
		const announcement =
			options.a11y?.announceStepChange && state.activeStepName
				? `Navigated to ${state.activeStepName}`
				: "";

		return (
			<FlowContext.Provider value={contextValue}>
				{options.a11y?.announceStepChange && <A11yAnnouncer message={announcement} />}
				<ErrorBoundary>
					{CurrentStep ? (
						<Suspense fallback={<div aria-busy="true">Loading...</div>}>
							<CurrentStep />
						</Suspense>
					) : null}
					{children}
				</ErrorBoundary>
			</FlowContext.Provider>
		);
	};

	FlowProvider.displayName = "FlowProvider";

	// ─── useFlow ───────────────────────────────────────────────────────────────

	function useFlow<
		TScreen extends TScreens[keyof TScreens],
		TPayloads extends Partial<Record<InferActions<TScreen>, unknown>> = Partial<
			Record<InferActions<TScreen>, unknown>
		>,
	>(_screen: TScreen): UseFlowReturn<TScreen, TPayloads> {
		const { store: s, state } = useFlowContext();

		const dispatch = useCallback(
			<TAction extends InferActions<TScreen>>(action: TAction, payload?: unknown) => {
				s.dispatch(action as string, payload);
			},
			[s]
		);

		const back = useCallback(() => {
			s.back();
		}, [s]);

		return {
			dispatch,
			back,
			history: state.history,
			currentStep: state.activeStepName,
			currentFlow: state.activeFlowName,
		};
	}

	// ─── useFlowManager ────────────────────────────────────────────────────────

	function useFlowManager(): UseFlowManagerReturn<TFlows> {
		const { store: s, state } = useFlowContext();

		const start = useCallback(
			(input: { flowName: keyof TFlows & string; stepName?: string; options?: StepOptions }) => {
				s.start(input);
			},
			[s]
		);

		const clearHistory = useCallback(() => {
			s.clearHistory();
		}, [s]);

		return {
			start,
			currentFlowName: state.activeFlowName as (keyof TFlows & string) | null,
			currentStepName: state.activeStepName,
			clearHistory,
		};
	}

	// ─── useFlowState ──────────────────────────────────────────────────────────

	function useFlowState(): FlowState {
		const { state } = useFlowContext();
		return state;
	}

	// ─── useFlowHistory ────────────────────────────────────────────────────────

	function useFlowHistory(): HistoryEntry[] {
		const { state } = useFlowContext();
		return state.history;
	}

	// ─── useFlowListener ───────────────────────────────────────────────────────

	function useFlowListener(type: ListenType, callback: ListenCallback): void {
		const { store: s } = useFlowContext();
		const callbackRef = useRef(callback);
		callbackRef.current = callback;

		useEffect(() => {
			const stableCallback: ListenCallback = (event) => {
				callbackRef.current(event);
			};
			const unsubscribe = s.addListener(type, stableCallback);
			return unsubscribe;
		}, [s, type]);
	}

	// ─── useFlowDiagram ────────────────────────────────────────────────────────

	function useFlowDiagram(): FlowDiagram {
		const { store: s } = useFlowContext();
		return useMemo(() => extractGraph(s.getFlows(), s.getScreens()), [s]);
	}

	// ─── getDiagram (non-hook) ────────────────────────────────────────────────

	function getDiagram(): FlowDiagram {
		return extractGraph(store.getFlows(), store.getScreens());
	}

	return {
		FlowProvider,
		useFlow,
		useFlowManager,
		useFlowState,
		useFlowHistory,
		useFlowListener,
		useFlowDiagram,
		getDiagram,
		store,
	};
}
