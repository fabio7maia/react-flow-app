import type { Register } from './index';

// ─── Ecrãs ────────────────────────────────────────────────────────────────────

declare const PAYLOAD: unique symbol;

/** Marcador de tipo para o payload de uma ação: `payload<{ ok: boolean }>()`. */
export type PayloadMarker<T> = { readonly kind: 'payload'; readonly [PAYLOAD]?: T };

/** Ações em array (sem payload) ou em objeto (`null` = sem payload). */
export type ActionsInput = readonly string[] | { readonly [action: string]: PayloadMarker<unknown> | null };

/** Metadados dos ecrãs, tipados pela app via `Register['meta']`. */
export type RegisteredMeta = Register extends { meta: infer M } ? M : Record<string, unknown>;

/**
 * O `default` é propositadamente `unknown`: se fosse `ComponentType`, o TS teria
 * de inferir o tipo de retorno do componente para validar o loader e, como o
 * componente usa `useFlow(screen)`, isso cria uma referência circular de tipos
 * (TS7022/TS7023). A validação de que é um componente fica para runtime.
 */
export type ScreenLoader = () => Promise<{ default: unknown }>;

export type ScreenDef<N extends string = string, A extends ActionsInput = ActionsInput> = {
	readonly kind: 'screen';
	readonly name: N;
	readonly actions: A;
	readonly meta?: RegisteredMeta;
	readonly loader: ScreenLoader;
};

/** `{ pay: { ok: boolean }; cancel: undefined }` a partir da declaração de ações. */
export type ActionMap<A> = A extends readonly string[]
	? { [K in A[number]]: undefined }
	: { [K in keyof A & string]: A[K] extends PayloadMarker<infer T> ? T : undefined };

export type ScreenActions<S> = S extends ScreenDef<string, infer A> ? ActionMap<A> : never;

export type ActionName<S> = keyof ScreenActions<S> & string;

/** Payload opcional quando a ação não tem payload, obrigatório caso contrário. */
export type DispatchArgs<M, K extends keyof M> = undefined extends M[K]
	? [action: K, payload?: M[K]]
	: [action: K, payload: M[K]];

// ─── Passos e transições ──────────────────────────────────────────────────────

export type StepOptions = {
	/** Passo inicial do flow (por omissão, o primeiro declarado). */
	initial?: boolean;
	/** Pode ser aberto diretamente por URL. */
	entrypoint?: boolean;
	/** Segmento de URL (por omissão, o nome do passo). */
	url?: string;
	/** Ao sair deste passo, não o guardar no histórico. */
	ignoreHistory?: boolean;
	/** Ao entrar neste passo, limpar o histórico. */
	clearHistory?: boolean;
	/** Permitir que o passo apareça várias vezes no histórico. */
	allowCyclicHistory?: boolean;
};

export type StepInput = StepOptions & { readonly screen: ScreenDef<string, any> };

export type StepsInput = { readonly [step: string]: StepInput };

export type HistoryEntry = { readonly flow: string; readonly step: string };

export type GotoRef<F extends string = string, S extends string = string> = {
	readonly kind: 'goto';
	readonly flow: F;
	readonly step: S;
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
};

export type LocalTarget<SN extends string> = SN | GotoRef | ExitRef;

export type Transition<SN extends string, P> = LocalTarget<SN> | BranchRef<LocalTarget<SN>, P>;

/** Para cada passo, as ações do ecrã ligado a esse passo → destino. */
export type TransitionsFor<S extends StepsInput> = {
	[K in keyof S]?: {
		[A in keyof ScreenActions<S[K]['screen']>]?: Transition<keyof S & string, ScreenActions<S[K]['screen']>[A]>;
	};
};

export type AnyTransition = string | GotoRef | ExitRef | BranchRef<unknown, any>;
