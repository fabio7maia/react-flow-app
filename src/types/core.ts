import type React from "react";

// ─── Screen Types ────────────────────────────────────────────────────────────

/**
 * Metadata attached to a screen.
 * Well-known fields are typed; any extra key is allowed for custom analytics.
 *
 * @example
 * ```ts
 * meta: {
 *   url: '/checkout/payment',   // Google Analytics page_view path
 *   title: 'Payment',           // document.title / GA page_title
 *   analyticsCategory: 'funnel',
 *   experiment: 'variant-b',
 * }
 * ```
 */
export type ScreenMeta = {
	/** URL / path for this screen — used for analytics page_view tracking */
	url?: string;
	/** Human-readable title (e.g. for document.title or GA page_title) */
	title?: string;
	/** Any additional custom fields (analytics labels, feature flags, …) */
	[key: string]: unknown;
};

export type ScreenConfig = {
	actions: readonly string[];
	loader: () => Promise<{ default: React.ComponentType<unknown> }>;
	/** Optional metadata propagated to every flow listener event for this screen */
	meta?: ScreenMeta;
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
	/** The action that triggered this event (only present for "dispatch" events) */
	action?: string;
	/** Payload passed to dispatch() — forwarded as-is for downstream propagation */
	payload?: unknown;
	/**
	 * Metadata of the active screen at the time of the event.
	 * Use this to forward analytics data (url, title, custom fields) to third-party
	 * services such as Google Analytics without coupling screens to tracking code.
	 *
	 * @example
	 * ```ts
	 * useFlowListener('all', (event) => {
	 *   if (event.meta?.url) {
	 *     gtag('config', 'GA_ID', { page_path: event.meta.url });
	 *   }
	 *   if (event.type === 'dispatch') {
	 *     gtag('event', event.action, { ...event.payload, ...event.meta });
	 *   }
	 * });
	 * ```
	 */
	meta?: ScreenMeta;
};

export type ListenCallback = (event: ListenEvent) => void;

// ─── Animation ───────────────────────────────────────────────────────────────

/** Visual transition type between steps.
 *  - `'fade'`  – cross-fade (default when animation is enabled)
 *  - `'slide'` – horizontal slide (direction-aware: forward / back)
 *  - `'none'`  – no animation
 */
export type AnimationType = "fade" | "slide" | "none";

// ─── App Options ─────────────────────────────────────────────────────────────

export type FlowAppOptions = {
	/** Enable URL hash synchronization */
	withUrl?: boolean;
	/**
	 * Enable and configure the transition animation between steps.
	 * - `true`     → uses `'fade'`
	 * - `false`    → no animation
	 * - `AnimationType` string → explicit type
	 */
	animation?: boolean | AnimationType;
	/** Duration of the transition animation in milliseconds (default 250) */
	animationDuration?: number;
	/** SSR-safe mode */
	ssr?: boolean;
	/** Accessibility options */
	a11y?: {
		/**
		 * Announce the current step name to screen readers via an aria-live region.
		 * Combine with a custom `stepLabel` to provide meaningful announcements.
		 */
		announceStepChange?: boolean;
		/**
		 * Move keyboard focus to the step content area after each navigation.
		 * Recommended for SPA keyboard accessibility.
		 */
		manageFocus?: boolean;
		/**
		 * Politeness level for the aria-live region.
		 * Use `'assertive'` only for time-critical updates. Default: `'polite'`.
		 */
		liveRegionPoliteness?: "polite" | "assertive";
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
