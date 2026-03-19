import type {
	FlowDefinition,
	FlowState,
	HistoryEntry,
	ListenCallback,
	ListenEvent,
	ListenType,
	ScreenConfig,
	StepOptions,
} from "../types/core";

type FlowRegistry = Record<string, FlowDefinition>;
type ScreenRegistry = Record<string, ScreenConfig>;

const INITIAL_STATE: FlowState = {
	activeFlowName: null,
	activeStepName: null,
	history: [],
	isLoading: false,
};

/**
 * FlowStore manages the navigation state using a pub/sub pattern
 * compatible with React's useSyncExternalStore.
 */
export class FlowStore {
	private state: FlowState = { ...INITIAL_STATE };
	private listeners: Set<() => void> = new Set();
	private eventListeners: Map<ListenType, Set<ListenCallback>> = new Map();
	private flows: FlowRegistry = {};
	private screens: ScreenRegistry = {};

	constructor(flows: FlowRegistry, screens: ScreenRegistry) {
		this.flows = flows;
		this.screens = screens;
	}

	// ─── useSyncExternalStore interface ────────────────────────────────────────

	subscribe = (callback: () => void): (() => void) => {
		this.listeners.add(callback);
		return () => {
			this.listeners.delete(callback);
		};
	};

	getSnapshot = (): FlowState => {
		return this.state;
	};

	getServerSnapshot = (): FlowState => {
		return this.state;
	};

	// ─── State mutation ────────────────────────────────────────────────────────

	private emit(): void {
		// Ensure immutability: create new object reference on each mutation
		this.state = { ...this.state };
		for (const listener of this.listeners) {
			listener();
		}
	}

	private emitEvent(event: ListenEvent): void {
		// Emit to specific type listeners
		const typeListeners = this.eventListeners.get(event.type);
		if (typeListeners) {
			for (const cb of typeListeners) {
				cb(event);
			}
		}
		// Emit to 'all' listeners
		const allListeners = this.eventListeners.get("all");
		if (allListeners) {
			for (const cb of allListeners) {
				cb(event);
			}
		}
	}

	// ─── Navigation actions ────────────────────────────────────────────────────

	/**
	 * Start a flow (mount it as active)
	 */
	start(input: { flowName: string; stepName?: string; options?: StepOptions }): void {
		const { flowName, stepName } = input;
		const flow = this.flows[flowName];

		if (!flow) {
			console.warn(`[react-flow-app] Flow "${flowName}" not found`);
			return;
		}

		// Find initial step
		const initialStep =
			stepName ??
			(Object.entries(flow.steps).find(([, opts]) => opts?.initialStep)?.[0] as string) ??
			(Object.keys(flow.steps)[0] as string);

		const stepOpts = flow.steps[initialStep];

		const newHistory: HistoryEntry[] = stepOpts?.clearHistory
			? [{ flowName, stepName: initialStep }]
			: [...this.state.history, { flowName, stepName: initialStep }];

		this.state = {
			...this.state,
			activeFlowName: flowName,
			activeStepName: initialStep,
			history: newHistory,
		};

		this.emit();
		this.emitEvent({ type: "mount", flowName, stepName: initialStep });
	}

	/**
	 * Dispatch an action from the current step
	 */
	dispatch(action: string, payload?: unknown): void {
		const { activeFlowName, activeStepName } = this.state;

		if (!activeFlowName || !activeStepName) {
			console.warn("[react-flow-app] dispatch called with no active flow");
			return;
		}

		const flow = this.flows[activeFlowName];
		if (!flow) return;

		const stepTransitions = (
			flow.transitions as Record<string, Record<string, unknown> | undefined>
		)[activeStepName];
		if (!stepTransitions) {
			console.warn(
				`[react-flow-app] No transitions defined for step "${activeStepName}" in flow "${activeFlowName}"`
			);
			return;
		}

		const target = stepTransitions[action];

		if (target === undefined) {
			console.warn(
				`[react-flow-app] Action "${action}" not found in step "${activeStepName}" of flow "${activeFlowName}"`
			);
			return;
		}

		const prevFlow = activeFlowName;
		const prevStep = activeStepName;

		if (typeof target === "string") {
			// Intra-flow navigation
			this.navigateTo(activeFlowName, target);
		} else if (typeof target === "function") {
			// Cross-flow or side-effect navigation
			const result = (target as () => { flowName: string; stepName: string } | undefined)();
			if (result?.flowName && result.stepName) {
				this.navigateTo(result.flowName, result.stepName);
			}
		}

		this.emitEvent({
			type: "dispatch",
			flowName: prevFlow,
			stepName: prevStep,
			action,
			payload,
		});
	}

	/**
	 * Navigate to a specific step (internal)
	 */
	private navigateTo(flowName: string, stepName: string): void {
		const flow = this.flows[flowName];
		if (!flow) {
			console.warn(`[react-flow-app] Flow "${flowName}" not found`);
			return;
		}

		const stepOpts = flow.steps[stepName] ?? {};
		let newHistory = [...this.state.history];

		if (stepOpts.clearHistory) {
			newHistory = [];
		} else if (!stepOpts.ignoreHistory) {
			newHistory.push({ flowName, stepName });
		}

		this.state = {
			...this.state,
			activeFlowName: flowName,
			activeStepName: stepName,
			history: newHistory,
		};

		this.emit();
		this.emitEvent({ type: "mount", flowName, stepName });
	}

	/**
	 * Navigate back in history
	 */
	back(): void {
		const { history } = this.state;

		if (history.length <= 1) {
			// No more history - backExit event
			if (this.state.activeFlowName && this.state.activeStepName) {
				this.emitEvent({
					type: "backExit",
					flowName: this.state.activeFlowName,
					stepName: this.state.activeStepName,
				});
			}
			return;
		}

		const newHistory = history.slice(0, -1);
		const previousEntry = newHistory[newHistory.length - 1];

		if (!previousEntry) return;

		this.state = {
			...this.state,
			activeFlowName: previousEntry.flowName,
			activeStepName: previousEntry.stepName,
			history: newHistory,
		};

		this.emit();
		this.emitEvent({
			type: "back",
			flowName: previousEntry.flowName,
			stepName: previousEntry.stepName,
		});
	}

	/**
	 * Clear navigation history
	 */
	clearHistory(): void {
		this.state = {
			...this.state,
			history:
				this.state.activeFlowName && this.state.activeStepName
					? [{ flowName: this.state.activeFlowName, stepName: this.state.activeStepName }]
					: [],
		};
		this.emit();
	}

	// ─── Event listener management ────────────────────────────────────────────

	addListener(type: ListenType, callback: ListenCallback): () => void {
		if (!this.eventListeners.has(type)) {
			this.eventListeners.set(type, new Set());
		}
		this.eventListeners.get(type)?.add(callback);
		return () => {
			this.eventListeners.get(type)?.delete(callback);
		};
	}

	// ─── Getters ───────────────────────────────────────────────────────────────

	getFlows(): FlowRegistry {
		return this.flows;
	}

	getScreens(): ScreenRegistry {
		return this.screens;
	}

	getCurrentLoader(): (() => Promise<{ default: React.ComponentType<unknown> }>) | null {
		const { activeFlowName, activeStepName } = this.state;
		if (!activeFlowName || !activeStepName) return null;

		const flow = this.flows[activeFlowName];
		if (!flow) return null;

		const screen = this.screens[activeStepName];
		return screen?.loader ?? null;
	}
}
