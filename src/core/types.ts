import type { Register } from '../index';

// ─── Screens ──────────────────────────────────────────────────────────────────

declare const PAYLOAD: unique symbol;

/** Type marker for an action payload: `payload<{ ok: boolean }>()`. */
export type PayloadMarker<T> = { readonly kind: 'payload'; readonly [PAYLOAD]?: T };

/** Actions as an array (no payloads) or an object (`null` = no payload). */
export type ActionsInput = readonly string[] | { readonly [action: string]: PayloadMarker<unknown> | null };

/** Screen metadata, typed by the app through `Register['meta']`. */
export type RegisteredMeta = Register extends { meta: infer M } ? M : Record<string, unknown>;

/**
 * `default` is deliberately `unknown`. With `ComponentType`, TypeScript would have to infer the
 * component's return type to check the loader and, since the component calls `useFlow(screen)`,
 * that is a circular type reference (TS7022/TS7023). The component check happens at runtime.
 */
export type ScreenLoader = () => Promise<{ default: unknown }>;

export type ScreenDef<N extends string = string, A extends ActionsInput = ActionsInput> = {
	readonly kind: 'screen';
	readonly name: N;
	readonly actions: A;
	readonly meta?: RegisteredMeta;
	readonly loader: ScreenLoader;
};

/** `{ pay: { ok: boolean }; cancel: undefined }` from the actions declaration. */
export type ActionMap<A> = A extends readonly string[]
	? { [K in A[number]]: undefined }
	: { [K in keyof A & string]: A[K] extends PayloadMarker<infer T> ? T : undefined };

export type ScreenActions<S> = S extends ScreenDef<string, infer A> ? ActionMap<A> : never;

export type ActionName<S> = keyof ScreenActions<S> & string;

/** Navigation options of a dispatch. */
export type DispatchOptions = {
	/** Do not keep the current step in the history. */
	ignoreHistory?: boolean;
	/** URL params of the target step. Without them, the step keeps the params of its last visit. */
	params?: Readonly<Record<string, string>>;
};

/** The payload is optional when the action has none, and required otherwise. */
export type DispatchArgs<M, K extends keyof M> = undefined extends M[K]
	? [action: K, payload?: M[K], options?: DispatchOptions]
	: [action: K, payload: M[K], options?: DispatchOptions];

// ─── Steps and transitions ────────────────────────────────────────────────────

export type StepOptions = {
	/** Initial step of the flow (defaults to the first declared step). */
	initial?: boolean;
	/** Can be opened directly by URL (deep link). */
	entrypoint?: boolean;
	/** URL segment (defaults to the step name). Supports params: `'pay/:orderId'`. */
	url?: string;
	/** When leaving this step, do not keep it in the history. */
	ignoreHistory?: boolean;
	/** When entering this step, clear the history. */
	clearHistory?: boolean;
	/** Allow the step to appear more than once in the history. */
	allowCyclicHistory?: boolean;
	/**
	 * When this step becomes active, keep the previous step of the flow mounted (hidden), with its
	 * state, refs and DOM. Back shows it again without remounting it. Consecutive steps with the
	 * option stack up; moving to a step without it unmounts them. Handy for list → detail.
	 */
	keepPreviousMounted?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StepInput = StepOptions & { readonly screen: ScreenDef<string, any> };

export type StepsInput = { readonly [step: string]: StepInput };

/**
 * Overlays (v2: `anotherObjects`): screens that are not steps (modals, panels) but whose actions
 * navigate the flow. They are part of the graph and of the validation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OverlaysInput = { readonly [overlay: string]: ScreenDef<string, any> };

export type HistoryEntry = {
	readonly flow: string;
	readonly step: string;
	/** URL params of the step (e.g. `pay/:orderId`), restored when going back. */
	readonly params?: Readonly<Record<string, string>>;
};

export type GotoRef<F extends string = string, S extends string = string> = {
	readonly kind: 'goto';
	readonly flow: F;
	/** Without a step, resumes the flow at the last step it was in (or its initial step). */
	readonly step?: S;
};

export type ExitRef = { readonly kind: 'exit' };

export type BranchContext = {
	readonly flow: string;
	readonly step: string;
	readonly history: readonly HistoryEntry[];
};

export type BranchRef<T = unknown, P = unknown> = {
	readonly kind: 'branch';
	readonly targets: readonly T[];
	readonly resolve: (ctx: BranchContext, payload: P) => T;
	/** Sample payload that leads `resolve` to each target (for tests generated from the graph). */
	readonly samples?: { readonly [key: string]: P | undefined };
};

/** Key of a target: `'payment'`, `'auth.login'`, `'auth.*'` (resume) or `'exit'`. */
export type TargetKey<T> = T extends string
	? T
	: T extends GotoRef<infer F, infer S>
		? [S] extends [never]
			? `${F}.*`
			: `${F}.${S}`
		: T extends ExitRef
			? 'exit'
			: never;

/** Action with a side effect only (no navigation). */
export type EffectRef<P = unknown> = {
	readonly kind: 'effect';
	readonly run: (ctx: BranchContext, payload: P) => void;
};

export type LocalTarget<SN extends string> = SN | GotoRef | ExitRef;

export type Transition<SN extends string, P> = LocalTarget<SN> | BranchRef<LocalTarget<SN>, P> | EffectRef<P>;

/** For each step (and overlay), the actions of its screen → target. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type TransitionsFor<S extends StepsInput, O extends OverlaysInput = {}> = {
	[K in keyof S]?: {
		[A in keyof ScreenActions<S[K]['screen']>]?: Transition<keyof S & string, ScreenActions<S[K]['screen']>[A]>;
	};
} & {
	[K in keyof O]?: {
		[A in keyof ScreenActions<O[K]>]?: Transition<keyof S & string, ScreenActions<O[K]>[A]>;
	};
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTransition = string | GotoRef | ExitRef | BranchRef<unknown, any> | EffectRef<any>;
