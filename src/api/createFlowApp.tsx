import React, {
	createContext,
	type LazyExoticComponent,
	lazy,
	Suspense,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { extractGraph } from "../diagram/extractGraph";
import { FlowStore } from "../store/flowStore";
import type {
	AnimationType,
	FlowAppOptions,
	FlowDefinition,
	FlowDiagram,
	FlowState,
	HistoryEntry,
	InferActions,
	ListenCallback,
	ListenEvent,
	ListenType,
	LoggerConfig,
	ScreenConfig,
	StepOptions,
	UseFlowManagerReturn,
	UseFlowReturn,
} from "../types/core";

// ─── CSS Transitions ──────────────────────────────────────────────────────────

const TRANSITION_CSS = `
.rfa-step-wrapper {
  position: relative;
  overflow: hidden;
}
.rfa-step-slot {
  width: 100%;
}
.rfa-step-slot[data-phase="leaving"] {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
}

/* Fade */
.rfa-fade .rfa-step-slot[data-phase="entering"] {
  animation: rfa-fade-in var(--rfa-dur, 250ms) ease-out both;
}
.rfa-fade .rfa-step-slot[data-phase="leaving"] {
  animation: rfa-fade-out var(--rfa-dur, 250ms) ease-in both;
}

/* Slide forward (dispatch / start) */
.rfa-slide-forward .rfa-step-slot[data-phase="entering"] {
  animation: rfa-slide-in-fwd var(--rfa-dur, 250ms) ease-out both;
}
.rfa-slide-forward .rfa-step-slot[data-phase="leaving"] {
  animation: rfa-slide-out-fwd var(--rfa-dur, 250ms) ease-in both;
}

/* Slide back (back()) */
.rfa-slide-back .rfa-step-slot[data-phase="entering"] {
  animation: rfa-slide-in-back var(--rfa-dur, 250ms) ease-out both;
}
.rfa-slide-back .rfa-step-slot[data-phase="leaving"] {
  animation: rfa-slide-out-back var(--rfa-dur, 250ms) ease-in both;
}

@keyframes rfa-fade-in  { from { opacity: 0 }        to { opacity: 1 } }
@keyframes rfa-fade-out { from { opacity: 1 }        to { opacity: 0 } }
@keyframes rfa-slide-in-fwd   { from { opacity: 0; transform: translateX(28px) }  to { opacity: 1; transform: none } }
@keyframes rfa-slide-out-fwd  { from { opacity: 1; transform: none }  to { opacity: 0; transform: translateX(-28px) } }
@keyframes rfa-slide-in-back  { from { opacity: 0; transform: translateX(-28px) } to { opacity: 1; transform: none } }
@keyframes rfa-slide-out-back { from { opacity: 1; transform: none }  to { opacity: 0; transform: translateX(28px) } }

/* Honor prefers-reduced-motion – shorten duration to 1 ms (keep layout flow) */
@media (prefers-reduced-motion: reduce) {
  .rfa-step-slot[data-phase="entering"],
  .rfa-step-slot[data-phase="leaving"] {
    animation-duration: 1ms !important;
  }
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveAnimType(animation: FlowAppOptions["animation"]): AnimationType {
	if (!animation) return "none";
	if (animation === true) return "fade";
	return animation;
}

// ─── A11y Live Region ─────────────────────────────────────────────────────────

function A11yAnnouncer({
	message,
	politeness,
}: {
	message: string;
	politeness: "polite" | "assertive";
}) {
	return (
		<div
			role="status"
			aria-live={politeness}
			aria-atomic="true"
			// Visually hidden but accessible to screen readers (standard SR-only technique)
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
					<div role="alert" aria-live="assertive" style={{ color: "red", padding: "1rem" }}>
						<strong>An error occurred.</strong> {this.state.error?.message ?? "Unknown error"}
					</div>
				)
			);
		}
		return this.props.children;
	}
}

// ─── Step Transition Component ────────────────────────────────────────────────

type SlotPhase = "entering" | "active" | "leaving";

type SlotItem = {
	id: string;
	Comp: LazyExoticComponent<React.ComponentType<unknown>>;
	phase: SlotPhase;
};

type StepTransitionProps = {
	stepId: string | null;
	loader: (() => Promise<{ default: React.ComponentType<unknown> }>) | null;
	animType: AnimationType;
	direction: "forward" | "back";
	duration: number;
	/** Ref placed on the active (non-leaving) step slot for focus management */
	activeSlotRef?: React.RefObject<HTMLDivElement | null>;
};

function StepTransition({
	stepId,
	loader,
	animType,
	direction,
	duration,
	activeSlotRef,
}: StepTransitionProps) {
	const [slots, setSlots] = useState<SlotItem[]>([]);
	// Cache lazy components by step ID so they are never recreated unnecessarily
	const compCache = useRef(new Map<string, LazyExoticComponent<React.ComponentType<unknown>>>());
	const prevStepId = useRef<string | null>(null);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Clean up timers when unmounting
	useEffect(() => {
		return () => {
			for (const t of timers.current) clearTimeout(t);
		};
	}, []);

	useEffect(() => {
		if (!stepId || !loader) {
			prevStepId.current = null;
			setSlots([]);
			return;
		}

		if (stepId === prevStepId.current) return;
		prevStepId.current = stepId;

		// Create or reuse a stable lazy component for this step
		if (!compCache.current.has(stepId)) {
			compCache.current.set(stepId, lazy(loader));
		}
		const Comp = compCache.current.get(stepId);

		if (animType === "none") {
			setSlots([{ id: stepId, Comp, phase: "active" }]);
			return;
		}

		// Clear any pending timers from a previous transition
		for (const t of timers.current) clearTimeout(t);
		timers.current = [];

		// Mark all current slots as leaving, add new slot as entering
		setSlots((prev) => [
			...prev.map((s) => ({ ...s, phase: "leaving" as const })),
			{ id: stepId, Comp, phase: "entering" as const },
		]);

		// One frame later: advance entering → active (so CSS transition has a start state)
		const t1 = setTimeout(() => {
			setSlots((prev) =>
				prev.map((s) => (s.id === stepId ? { ...s, phase: "active" as const } : s))
			);
		}, 16);

		// After animation completes: prune leaving slots
		const t2 = setTimeout(() => {
			setSlots((prev) => prev.filter((s) => s.id === stepId));
		}, duration + 60);

		timers.current = [t1, t2];
	}, [stepId, loader, animType, duration]);

	if (slots.length === 0) return null;

	const wrapperClass = [
		"rfa-step-wrapper",
		animType === "fade" ? "rfa-fade" : animType === "slide" ? `rfa-slide-${direction}` : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={wrapperClass} style={{ "--rfa-dur": `${duration}ms` } as React.CSSProperties}>
			{slots.map((slot) => {
				const isLeaving = slot.phase === "leaving";
				return (
					<div
						key={slot.id}
						className="rfa-step-slot"
						data-phase={slot.phase}
						aria-hidden={isLeaving ? "true" : undefined}
						// Programmatically focusable (for focus management) but not in tab order
						tabIndex={!isLeaving ? -1 : undefined}
						ref={!isLeaving ? (activeSlotRef as React.RefObject<HTMLDivElement>) : undefined}
					>
						<Suspense
							fallback={
								<div
									role="status"
									aria-label="Loading screen"
									aria-busy="true"
									aria-live="polite"
								/>
							}
						>
							<slot.Comp />
						</Suspense>
					</div>
				);
			})}
		</div>
	);
}

// ─── Context ──────────────────────────────────────────────────────────────────

type FlowContextValue = {
	store: FlowStore;
	state: FlowState;
	options: FlowAppOptions;
};

// ─── Provider Props ───────────────────────────────────────────────────────────

type FlowProviderProps = {
	children?: React.ReactNode;
	initialFlow?: string;
	initialStep?: string;
	/** Optional fallback shown while the step component is loading */
	loadingFallback?: React.ReactNode;
	/** Custom fallback for the error boundary */
	errorFallback?: React.ReactNode;
};

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
 *   options: {
 *     animation: 'slide',
 *     animationDuration: 300,
 *     a11y: { announceStepChange: true, manageFocus: true },
 *   },
 * });
 * ```
 */
export function createFlowApp<
	TScreens extends Record<string, ScreenConfig>,
	TFlows extends Record<string, FlowDefinition<TScreens>>,
>(config: CreateFlowAppConfig<TScreens, TFlows>): CreateFlowAppOutput<TScreens, TFlows> {
	const { screens, flows, options = {} } = config;

	const store = new FlowStore(flows as Record<string, FlowDefinition>, screens);

	const FlowContext = createContext<FlowContextValue | null>(null);

	function useFlowContext(): FlowContextValue {
		const ctx = useContext(FlowContext);
		if (!ctx) {
			throw new Error("[react-flow-app] Hook must be used inside <FlowProvider>");
		}
		return ctx;
	}

	// ─── FlowProvider ──────────────────────────────────────────────────────────

	const FlowProvider: React.FC<FlowProviderProps> = ({
		children,
		initialFlow,
		initialStep,
		errorFallback,
	}) => {
		const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

		// Track navigation direction for slide transitions
		const directionRef = useRef<"forward" | "back">("forward");

		// Start initial flow once, preferring a URL entrypoint when one matches.
		//
		// Resolution order:
		//  1. window.location.pathname  (e.g. /test/startup)
		//  2. window.location.hash      (e.g. #/test/startup or #test/startup)
		//  3. initialFlow + initialStep (explicit prop fallback)
		const startedRef = useRef(false);
		useEffect(() => {
			if (startedRef.current) return;
			startedRef.current = true;

			if (typeof window !== "undefined") {
				const candidates = [
					window.location.pathname,
					// normalise hash: strip leading # and optional /
					window.location.hash.replace(/^#\/?/, "/"),
				];
				for (const candidate of candidates) {
					const resolved = store.resolveEntrypoint(candidate);
					if (resolved) {
						store.start({ flowName: resolved.flowName, stepName: resolved.stepName });
						return;
					}
				}
			}

			if (initialFlow) {
				store.start({ flowName: initialFlow, stepName: initialStep });
			}
		}, [initialFlow, initialStep]);

		// Subscribe to store events to track direction (outside React render)
		useEffect(() => {
			const unsubBack = store.addListener("back", () => {
				directionRef.current = "back";
			});
			const unsubDispatch = store.addListener("dispatch", () => {
				directionRef.current = "forward";
			});
			const unsubMount = store.addListener("mount", () => {
				// start() always goes forward
				directionRef.current = "forward";
			});
			return () => {
				unsubBack();
				unsubDispatch();
				unsubMount();
			};
		}, []);

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

		// Resolve animation config
		const animType = resolveAnimType(options.animation);
		const duration = options.animationDuration ?? 250;

		// Current step for the transition component (computed early — also used by focus effect)
		const stepId =
			state.activeFlowName && state.activeStepName
				? `${state.activeFlowName}_${state.activeStepName}`
				: null;

		// Focus management: move focus to step content after navigation
		const activeSlotRef = useRef<HTMLDivElement | null>(null);
		useEffect(() => {
			if (!stepId) return;
			if (options.a11y?.manageFocus && activeSlotRef.current) {
				// Small delay to let Suspense / transition settle before moving focus
				const t = setTimeout(() => {
					activeSlotRef.current?.focus({ preventScroll: false });
				}, 50);
				return () => clearTimeout(t);
			}
		}, [stepId]);
		const loader = store.getCurrentLoader();

		// A11y announcement message
		const a11yOpts = options.a11y ?? {};
		const politeness = a11yOpts.liveRegionPoliteness ?? "polite";
		const announcement =
			a11yOpts.announceStepChange && state.activeStepName
				? `Step: ${state.activeStepName}${state.activeFlowName ? ` (${state.activeFlowName})` : ""}`
				: "";

		return (
			<FlowContext.Provider value={contextValue}>
				{/* Inject transition styles only when animations are enabled */}
				{animType !== "none" && <style>{TRANSITION_CSS}</style>}

				{/* Visually-hidden live region for screen-reader announcements */}
				{a11yOpts.announceStepChange && (
					<A11yAnnouncer message={announcement} politeness={politeness} />
				)}

				{/*
				 * Main content landmark.
				 * tabIndex={-1} allows programmatic focus without adding to tab order.
				 * aria-label provides context for AT users who navigate by landmarks.
				 */}
				<ErrorBoundary fallback={errorFallback}>
					<main
						aria-label={state.activeFlowName ? `${state.activeFlowName} flow` : "Application flow"}
					>
						<StepTransition
							stepId={stepId}
							loader={loader}
							animType={animType}
							direction={directionRef.current}
							duration={duration}
							activeSlotRef={activeSlotRef}
						/>
					</main>

					{/* Slot for consumer-provided children (not part of the step) */}
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
			const stableCallback: ListenCallback = (event: ListenEvent) => {
				callbackRef.current(event);
			};
			return s.addListener(type, stableCallback);
		}, [s, type]);
	}

	// ─── useFlowDiagram ────────────────────────────────────────────────────────

	function useFlowDiagram(): FlowDiagram {
		const { store: s } = useFlowContext();
		return useMemo(() => extractGraph(s.getFlows(), s.getScreens()), [s]);
	}

	// ─── getDiagram (non-hook, no context needed) ─────────────────────────────

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
