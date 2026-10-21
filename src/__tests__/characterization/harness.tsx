/* cspell:disable */
/**
 * Harness para os testes de caracterização da v2.
 *
 * Usa a API pública real (FlowManager, FlowProvider, useFlow, useFlowManager) com
 * ecrãs React reais carregados por React.lazy, e regista os eventos dos listeners.
 * O objetivo é fixar o comportamento ATUAL (incluindo particularidades), não o ideal.
 */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useFlow, useFlowManager } from '../../hooks';
import { FlowManager } from '../../models';
import { FlowProvider } from '../../providers';
import { TFlowListenCallbackInput, TFlowManagerOptions, TStepOptions } from '../../types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type ScreenApi = ReturnType<typeof useFlow> & { manager: ReturnType<typeof useFlowManager> };

export type ScreensSpec = Record<string, readonly string[]>;

let uniqueId = 0;

/**
 * A v2 exige, em tipos, que `step(...)` mapeie TODAS as ações do ecrã (Record, não Partial).
 * Os cenários só mapeiam as ações relevantes, por isso o flow é tipado de forma permissiva.
 */
type LooseFlow = {
	step: (name: string) => (actions: Record<string, unknown>) => void;
	anotherObject: (name: string) => (actions: Record<string, unknown>) => void;
	listen: (cb: (input: TFlowListenCallbackInput) => void) => () => void;
	navigateTo: (stepName?: string, options?: Record<string, unknown>) => any;
	name: () => string;
};

/**
 * Cria um FlowManager com ecrãs de teste. Cada ecrã renderiza o seu nome e expõe a API
 * do `useFlow` em `harness.api()`.
 *
 * Os nomes dos flows recebem um sufixo único por teste, porque a v2 guarda a cache de
 * componentes lazy num objeto global indexado pelo nome do flow.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity, @typescript-eslint/explicit-function-return-type
export function createHarness<TSpec extends ScreensSpec>(spec: TSpec, anotherObjects: Record<string, any> = {}) {
	const suffix = `_${++uniqueId}`;
	const current: { api?: ScreenApi; screen?: string; objects: Record<string, ReturnType<typeof useFlow>> } = {
		objects: {},
	};
	const screens: Record<string, any> = {};

	for (const [name, actions] of Object.entries(spec)) {
		const Screen: React.FC = () => {
			const api = useFlow(screens[name]);
			const manager = useFlowManager();
			// Hooks para os "anotherObjects" (ex.: modais), na mesma ordem em todos os renders.
			for (const [objectName, object] of Object.entries(anotherObjects)) {
				// eslint-disable-next-line react-hooks/rules-of-hooks
				current.objects[objectName] = useFlow(object);
			}
			current.api = { ...api, manager };
			current.screen = name;
			return <p data-screen={name}>{name}</p>;
		};
		screens[name] = {
			actions,
			loader: () => React.lazy(() => Promise.resolve({ default: Screen })),
		};
	}

	const fm = new FlowManager(
		screens as { [K in keyof TSpec]: { actions: TSpec[K] } } & Record<string, any>,
		anotherObjects
	);
	const events: string[] = [];
	let root: Root | undefined;
	let container: HTMLDivElement | undefined;

	const recordEvent = (source: string) => (input: TFlowListenCallbackInput): void => {
		const action = input.dispatch?.actionName ? `:${input.dispatch.actionName}` : '';
		events.push(`${source} ${input.type}${action} @${strip(input.flowName)}.${input.currentStepName}`);
	};

	const strip = (flowName: string): string => flowName.replace(suffix, '');

	const flush = async (): Promise<void> => {
		for (let i = 0; i < 5; i++) {
			await act(async () => {
				await Promise.resolve();
			});
		}
	};

	return {
		fm,
		events,
		/** Nome do flow com o sufixo único deste teste. */
		name: (flowName: string): string => `${flowName}${suffix}`,
		strip,
		flow: (flowName: string, baseUrl = flowName) => ({
			steps: (steps: Record<string, TStepOptions>): LooseFlow =>
				(fm
					.flow({ name: `${flowName}${suffix}` as never, baseUrl })
					.steps(steps as never) as unknown) as LooseFlow,
		}),
		/** Regista os listeners do flow (`f.listen`) no array `events`, prefixados por `flow`. */
		listenFlow: (flow: { listen: (cb: any) => () => void }): (() => void) => flow.listen(recordEvent('flow')),
		async render(props: {
			initialFlowName: string;
			initialStepName?: string;
			initialHistory?: string[];
			options?: TFlowManagerOptions;
			withListenProp?: boolean;
			onFlowMount?: Record<string, () => void>;
			onFlowUnmount?: Record<string, () => void>;
		}): Promise<void> {
			container = document.createElement('div');
			document.body.appendChild(container);
			root = createRoot(container);
			const { initialFlowName, withListenProp, ...rest } = props;
			await act(async () => {
				root?.render(
					<FlowProvider
						fm={fm}
						initialFlowName={`${initialFlowName}${suffix}`}
						options={{ animation: false, withUrl: false, ...props.options }}
						listen={withListenProp ? recordEvent('provider') : undefined}
						{...rest}
					/>
				);
			});
			await flush();
		},
		/** Ecrã visível (pelo DOM). */
		screen: (): string | undefined =>
			container?.querySelector('[data-screen]')?.getAttribute('data-screen') ?? undefined,
		api: (): ScreenApi => {
			if (!current.api) throw new Error('Nenhum ecrã renderizado');
			return current.api;
		},
		async dispatch(
			action: string,
			payload?: Record<string, unknown>,
			options?: Record<string, unknown>
		): Promise<void> {
			await act(async () => {
				current.api?.dispatch(action as never, payload, options);
			});
			await flush();
		},
		/** Dispatch a partir de um "anotherObject" (ex.: modal), e não do ecrã atual. */
		async dispatchFrom(objectName: string, action: string): Promise<void> {
			await act(async () => {
				current.objects[objectName]?.dispatch(action as never);
			});
			await flush();
		},
		async back(): Promise<void> {
			await act(async () => {
				current.api?.back();
			});
			await flush();
		},
		async start(flowName: string, stepName?: string, options?: Record<string, unknown>): Promise<void> {
			await act(async () => {
				current.api?.manager.start({ flowName: `${flowName}${suffix}`, stepName, options });
			});
			await flush();
		},
		/** Histórico do flow atual (nomes dos passos). */
		history: (): string[] => [...(current.api?.getHistory() ?? [])],
		async unmount(): Promise<void> {
			await act(async () => root?.unmount());
			container?.remove();
		},
	};
}
