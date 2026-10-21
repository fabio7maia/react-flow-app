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

/** Opções de navegação de um dispatch (v2: opções do dispatch). */
export type DispatchOptions = {
	/** Não guardar o passo atual no histórico. */
	ignoreHistory?: boolean;
	/** Parâmetros de URL do passo de destino. */
	params?: Readonly<Record<string, string>>;
};

/** Payload opcional quando a ação não tem payload, obrigatório caso contrário. */
export type DispatchArgs<M, K extends keyof M> = undefined extends M[K]
	? [action: K, payload?: M[K], options?: DispatchOptions]
	: [action: K, payload: M[K], options?: DispatchOptions];

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

/**
 * Overlays (v2: `anotherObjects`): ecrãs que não são passos (modais, painéis) mas
 * cujas ações navegam no flow. Participam no grafo e na validação.
 */
export type OverlaysInput = { readonly [overlay: string]: ScreenDef<string, any> };

export type HistoryEntry = {
	readonly flow: string;
	readonly step: string;
	/** Parâmetros de URL do passo (ex.: `pay/:orderId`), repostos ao voltar atrás. */
	readonly params?: Readonly<Record<string, string>>;
};

export type GotoRef<F extends string = string, S extends string = string> = {
	readonly kind: 'goto';
	readonly flow: F;
	/** Sem passo: retoma o flow no último passo onde esteve (ou no inicial). */
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
	/** Payload de exemplo que leva o `resolve` a cada alvo (para testes gerados a partir do grafo). */
	readonly samples?: { readonly [key: string]: P | undefined };
};

/** Chave de um alvo: `'payment'`, `'auth.login'`, `'auth.*'` (retoma) ou `'exit'`. */
export type TargetKey<T> = T extends string
	? T
	: T extends GotoRef<infer F, infer S>
	? [S] extends [never]
		? `${F}.*`
		: `${F}.${S}`
	: T extends ExitRef
	? 'exit'
	: never;

/** Ação só com efeito (sem navegação). Equivalente à função sem retorno da v2. */
export type EffectRef<P = unknown> = {
	readonly kind: 'effect';
	readonly run: (ctx: BranchContext, payload: P) => void;
};

export type LocalTarget<SN extends string> = SN | GotoRef | ExitRef;

export type Transition<SN extends string, P> = LocalTarget<SN> | BranchRef<LocalTarget<SN>, P> | EffectRef<P>;

/** Para cada passo (e overlay), as ações do ecrã ligado → destino. */
export type TransitionsFor<S extends StepsInput, O extends OverlaysInput = {}> = {
	[K in keyof S]?: {
		[A in keyof ScreenActions<S[K]['screen']>]?: Transition<keyof S & string, ScreenActions<S[K]['screen']>[A]>;
	};
} & {
	[K in keyof O]?: {
		[A in keyof ScreenActions<O[K]>]?: Transition<keyof S & string, ScreenActions<O[K]>[A]>;
	};
};

export type AnyTransition = string | GotoRef | ExitRef | BranchRef<unknown, any> | EffectRef<any>;
