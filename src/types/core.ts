import type React from "react";

// ─── Screen Types ────────────────────────────────────────────────────────────

export type ScreenConfig = {
	actions: readonly string[];
	loader: () => Promise<{ default: React.ComponentType<unknown> }>;
	meta?: Record<string, unknown>;
};

export type InferActions<TScreen extends ScreenConfig> = TScreen["actions"][number];

export type InferredScreens<TConfig extends Record<string, ScreenConfig>> = {
	[K in keyof TConfig]: TConfig[K] & {
		readonly name: K;
		readonly __brand: "Screen";
	};
};

// ─── Step Types ──────────────────────────────────────────────────────────────

export type StepOptions = {
	/** Mark as initial step of the flow */
	initialStep?: boolean;
	/** URL segment for this step */
	url?: string;
	/** Don't add this step to navigation history */
	ignoreHistory?: boolean;
	/** Clear history when reaching this step */
	clearHistory?: boolean;
	/** Allow going back to this step even if already visited */
	allowCyclicHistory?: boolean;
	/** Mark as a checkpoint (can always go back to here) */
	checkpoint?: boolean;
};

// ─── Navigation Result ───────────────────────────────────────────────────────

export type NavigationResult = {
	flowName: string;
	stepName: string;
};

// ─── Transition Map ──────────────────────────────────────────────────────────

export type TransitionTarget<TScreens extends Record<string, ScreenConfig>> =
	| keyof TScreens
	| (() => NavigationResult | undefined);

export type TransitionMap<TScreens extends Record<string, ScreenConfig>> = {
	[StepName in keyof TScreens]?: {
		[ActionName in InferActions<TScreens[StepName]>]?: TransitionTarget<TScreens>;
	};
};

// ─── Flow Config ─────────────────────────────────────────────────────────────

export type FlowConfig<
	TScreens extends Record<string, ScreenConfig>,
	TName extends string = string,
> = {
	name: TName;
	baseUrl?: string;
	steps: Partial<Record<keyof TScreens, StepOptions>>;
	transitions: TransitionMap<TScreens>;
};

export type FlowDefinition<
	// biome-ignore lint/suspicious/noExplicitAny: needed for flexible generic constraint
	TScreens extends Record<string, ScreenConfig> = any,
	TName extends string = string,
> = FlowConfig<TScreens, TName> & {
	readonly __brand: "Flow";
};

// ─── Flow State ──────────────────────────────────────────────────────────────

export type HistoryEntry = {
	flowName: string;
	stepName: string;
};

export type FlowState = {
	activeFlowName: string | null;
	activeStepName: string | null;
	history: HistoryEntry[];
	isLoading: boolean;
};

// ─── Listener Types ──────────────────────────────────────────────────────────

export type ListenType = "all" | "mount" | "back" | "backExit" | "dispatch";

export type ListenEvent = {
	type: Exclude<ListenType, "all">;
	flowName: string;
	stepName: string;
	action?: string;
	payload?: unknown;
};

export type ListenCallback = (event: ListenEvent) => void;

// ─── App Options ─────────────────────────────────────────────────────────────

export type FlowAppOptions = {
	/** Enable URL hash synchronization */
	withUrl?: boolean;
	/** Enable animations between steps */
	animation?: boolean;
	/** SSR-safe mode */
	ssr?: boolean;
	/** Accessibility options */
	a11y?: {
		announceStepChange?: boolean;
		manageFocus?: boolean;
	};
};

export type LoggerConfig = {
	enabled?: boolean;
	groups?: string[];
};

// ─── Hook Return Types ───────────────────────────────────────────────────────

export type UseFlowReturn<
	TScreen extends ScreenConfig,
	TPayloads extends Partial<Record<InferActions<TScreen>, unknown>> = Partial<
		Record<InferActions<TScreen>, unknown>
	>,
> = {
	dispatch: <TAction extends InferActions<TScreen>>(
		action: TAction,
		payload?: TAction extends keyof TPayloads ? TPayloads[TAction] : Record<string, unknown>
	) => void;
	back: () => void;
	history: HistoryEntry[];
	currentStep: string | null;
	currentFlow: string | null;
};

export type UseFlowManagerReturn<TFlows extends Record<string, FlowDefinition>> = {
	start: (input: {
		flowName: keyof TFlows & string;
		stepName?: string;
		options?: StepOptions;
	}) => void;
	currentFlowName: (keyof TFlows & string) | null;
	currentStepName: string | null;
	clearHistory: () => void;
};

// ─── Diagram Types ───────────────────────────────────────────────────────────

export type DiagramNode = {
	id: string;
	flowName: string;
	stepName: string;
	actions: string[];
	options: StepOptions;
	isInitial: boolean;
};

export type DiagramEdge = {
	from: string;
	to: string;
	action: string;
	isCrossFlow: boolean;
};

export type FlowDiagram = {
	nodes: DiagramNode[];
	edges: DiagramEdge[];
};

export type DiagramFormat = "mermaid" | "json" | "dot";

export type DiagramOptions = {
	format?: DiagramFormat;
	direction?: "LR" | "TB" | "RL" | "BT";
	groupByFlow?: boolean;
	includeActions?: boolean;
	highlightFlow?: string;
	theme?: "default" | "dark" | "minimal";
};

export type DiagramOutput = {
	raw: FlowDiagram;
	rendered: string;
};
