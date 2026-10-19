# Abordagem B — Flows como máquinas de estados (XState v5)

> Parte de um conjunto de 3 abordagens para a v3 do `react-flow-app`. Ver [comparativo](./00-comparativo.md).

## Resumo

Deixar de manter um motor de navegação próprio e usar o **XState v5** como engine. Cada flow passa a ser uma máquina (ou um estado composto de uma máquina raiz). Os passos são estados, e as ações dos ecrãs são eventos.

O `react-flow-app` fica como uma **camada fina e opinativa** por cima. Faz quatro coisas:

1. Um builder (`defineFlowMachine`) que gera a máquina a partir de ecrãs e transições, e esconde o boilerplate do XState no caso simples.
2. A pilha de histórico (back) guardada no `context` da máquina, porque os _history states_ do XState não são uma pilha de navegação.
3. O render dos ecrãs a partir de `state.meta` (loader, url, title), mais Suspense e View Transitions.
4. A sincronização com o URL e os eventos de analytics.

O diagrama, o inspector, os guards, a lógica assíncrona e a geração de caminhos de teste vêm do ecossistema Stately.

## Inspiração na comunidade

| Projeto | O que aproveitar |
|---|---|
| **XState v5** (`setup().createMachine`) | Modelo formal (statecharts), tipos via `setup({ types })`, guards, `invoke` para async |
| **Stately Studio / visualizer / inspector** | Editor visual e inspeção em tempo real das máquinas, sem custo para a lib |
| **`xstate/graph`** (`getShortestPaths`, `getSimplePaths`) | Geração automática de caminhos para model-based testing |
| `@xstate/react` (`useActorRef`, `useSelector`) | Subscrições com seletores, sem re-renders globais |

## Exemplo

O cenário é o mesmo das outras abordagens: checkout (`cart → payment → success | failure`), com salto para auth.

### 1. Ecrãs (igual às outras abordagens)

```ts
// screens.ts
import { defineScreens } from 'react-flow-app';

export const screens = defineScreens({
	cart: { actions: ['checkout'], loader: () => import('./screens/Cart') },
	payment: { actions: ['pay', 'cancel'], loader: () => import('./screens/Payment') },
	success: { actions: ['finish'], loader: () => import('./screens/Success') },
	failure: { actions: ['retry'], loader: () => import('./screens/Failure') },
	login: { actions: ['loggedIn'], loader: () => import('./screens/Login') },
});
```

### 2a. Caso simples — builder da lib (sem ver XState)

```ts
// flows.ts
import { defineFlowMachine } from 'react-flow-app/xstate';
import { screens } from './screens';

export const appMachine = defineFlowMachine(screens, {
	id: 'app',
	initial: 'checkout',
	flows: {
		checkout: {
			baseUrl: 'checkout',
			initial: 'cart',
			steps: {
				cart: {
					on: {
						checkout: [
							{ target: 'payment', guard: 'isLoggedIn' },
							{ target: '#app.auth.login' }, // cross-flow = transição para outro estado composto
						],
					},
				},
				payment: {
					url: 'pay/:orderId',
					on: {
						pay: [{ target: 'success', guard: 'paymentOk' }, { target: 'failure' }],
						cancel: 'cart',
					},
				},
				failure: { ignoreHistory: true, on: { retry: 'payment' } },
				success: { clearHistory: true, on: { finish: '#app.home' } },
			},
		},
		auth: {
			baseUrl: 'auth',
			initial: 'login',
			steps: {
				login: { on: { loggedIn: { target: 'exit' } } }, // 'exit' = pop para o flow de origem
			},
		},
	},
	guards: {
		isLoggedIn: ({ context }) => context.session != null,
		paymentOk: ({ event }) => event.payload.ok === true,
	},
});
```

### 2b. O que o builder gera (XState puro, editável no Stately Studio)

```ts
import { setup, assign } from 'xstate';

export const appMachine = setup({
	types: {
		context: {} as { history: string[]; session: Session | null; params: Record<string, string> },
		events: {} as
			| { type: 'checkout' }
			| { type: 'pay'; payload: { ok: boolean } }
			| { type: 'cancel' }
			| { type: 'retry' }
			| { type: 'finish' }
			| { type: 'loggedIn' }
			| { type: 'BACK' },
	},
	actions: {
		pushHistory: assign({ history: ({ context, self }) => [...context.history, currentPath(self)] }),
		clearHistory: assign({ history: [] }),
	},
	guards: {
		isLoggedIn: ({ context }) => context.session != null,
		paymentOk: ({ event }) => event.type === 'pay' && event.payload.ok,
		canGoBack: ({ context }) => context.history.length > 0,
	},
}).createMachine({
	id: 'app',
	initial: 'checkout',
	context: { history: [], session: null, params: {} },
	on: { BACK: { guard: 'canGoBack', actions: 'popHistory' /* + transição dinâmica via raise */ } },
	states: {
		checkout: {
			initial: 'cart',
			states: {
				cart: {
					meta: { screen: 'cart', url: 'checkout/cart' },
					on: {
						checkout: [
							{ target: 'payment', guard: 'isLoggedIn', actions: 'pushHistory' },
							{ target: '#app.auth.login', actions: 'pushHistory' },
						],
					},
				},
				payment: {
					meta: { screen: 'payment', url: 'checkout/pay/:orderId' },
					on: {
						pay: [
							{ target: 'success', guard: 'paymentOk', actions: 'pushHistory' },
							{ target: 'failure', actions: 'pushHistory' },
						],
						cancel: { target: 'cart', actions: 'pushHistory' },
					},
				},
				failure: { meta: { screen: 'failure', ignoreHistory: true }, on: { retry: 'payment' } },
				success: { meta: { screen: 'success' }, entry: 'clearHistory' },
			},
		},
		auth: {
			initial: 'login',
			states: { login: { meta: { screen: 'login', url: 'auth/login' } } },
		},
	},
});
```

O `BACK` dinâmico (voltar ao estado guardado na pilha) **não é natural em statecharts**: os alvos são estáticos. A lib tem de resolver isso com uma transição por cada estado alvo possível (gerada pelo builder) ou com um `restore` do snapshot. É a maior fricção desta abordagem.

### 3. App e ecrãs

```tsx
import { createFlowApp } from 'react-flow-app/xstate';
import { appMachine } from './flows';

export const { FlowProvider, useFlow, useFlowSelector } = createFlowApp(appMachine, {
	url: { mode: 'hash' },
	inspect: import.meta.env.DEV, // liga o Stately Inspector em dev
});

// screens/Payment.tsx
export default function Payment() {
	const { send, back } = useFlow('payment'); // eventos tipados a partir do setup()
	return <button onClick={() => send({ type: 'pay', payload: { ok: true } })}>Pagar</button>;
}
```

### 4. Diagrama

- **De graça:** o Stately visualizer, o Studio e o inspector mostram a máquina, o estado ativo e os eventos. Com o VS Code + extensão Stately, o diagrama fica ao lado do código.
- **Na lib:** `toMermaid(appMachine)` percorre `machine.root` (estados, `on`, guards) e gera Mermaid para README e PRs. Os guards aparecem como labels nas arestas (`pay [paymentOk]`).

### 5. Validação e controlo do desenvolvimento

- O TypeScript, via `setup({ types })`, valida eventos e guards por nome.
- **Alvos inválidos** (`'#app.auth.loginn'`) **só falham em runtime**, quando a máquina é criada. Um teste `createActor(appMachine).start()` em CI apanha-os.
- Para passos inalcançáveis, `getSimplePaths` permite comparar os estados alcançados com todos os estados declarados.

### 6. Testes

```ts
import { createActor } from 'xstate';
import { getShortestPaths } from 'xstate/graph';
import { appMachine } from './flows';

it('pagamento falhado volta ao payment com retry', () => {
	const actor = createActor(appMachine, { snapshot: loggedInSnapshot }).start();
	actor.send({ type: 'checkout' });
	actor.send({ type: 'pay', payload: { ok: false } });
	expect(actor.getSnapshot().matches({ checkout: 'failure' })).toBe(true);
	actor.send({ type: 'retry' });
	expect(actor.getSnapshot().matches({ checkout: 'payment' })).toBe(true);
});

// Model-based: um teste por caminho mais curto até cada estado
const paths = getShortestPaths(appMachine, {
	events: [
		{ type: 'checkout' },
		{ type: 'pay', payload: { ok: true } },
		{ type: 'pay', payload: { ok: false } },
		{ type: 'cancel' },
		{ type: 'retry' },
	],
});

describe.each(paths.map((p) => [JSON.stringify(p.state.value), p]))('chega a %s', (_, path) => {
	it('na UI', async () => {
		const ui = renderFlow(App);
		for (const step of path.steps) await ui.send(step.event);
		expect(ui.currentScreen()).toBe(path.state.getMeta()?.screen);
	});
});
```

## Mapeamento das funcionalidades da v2

| v2 | Abordagem B |
|---|---|
| Flows / steps / actions | Estados compostos / estados / eventos |
| Ação como função | Array de transições com `guard` (+ `actions` para efeitos) |
| `ignoreHistory`, `clearHistory` | `meta` + actions geradas (`pushHistory`, `clearHistory`) |
| `allowCyclicHistory`, `checkpoint` | Lógica própria na action `pushHistory` — **o XState não ajuda aqui** |
| `fromFlow` / `backExit` | Pilha no `context` + evento `exit` |
| `listen` | `actor.subscribe` / `inspect` / `useFlowEvents` da lib |
| `anotherObjects` (modais) | Estado paralelo (`type: 'parallel'`) ou um actor filho |

## Prós

- **Modelo formal e maduro.** Guards, ações, `invoke` assíncrono (ex.: validar o pagamento antes de mudar de passo), estados paralelos e hierarquia vêm sem custo.
- **Ferramentas de diagrama de nível profissional** já prontas (Studio, visualizer, inspector, extensão VS Code). Não é preciso construir devtools.
- **Model-based testing** suportado oficialmente (`xstate/graph`).
- **Menos código para manter.** A lib reduz-se a um builder, ao histórico, ao render e ao URL.
- **Comunidade grande.** Muitos devs já conhecem XState e existem bastantes recursos.
- **Escala bem para fluxos com regras de negócio complexas** (onboarding com KYC, seguros, crédito).

## Contras

- **A navegação em pilha não é nativa.** O back dinâmico, o `allowCyclicHistory` e o `checkpoint` têm de ser emulados por cima. Isto vai contra o modelo (alvos estáticos) e é precisamente o coração da lib.
- **Curva de aprendizagem e verbosidade.** Para um wizard de 3 passos, o XState é exagerado. O builder esconde-o, mas a abstração é "leaky" assim que for preciso algo fora do comum.
- **Dependência de runtime de ~14 kB gz** (xstate 5.x) e acoplamento ao roadmap da Stately, que já descontinuou pacotes no passado (`@xstate/test` passou para `@xstate/graph`).
- **Alvos validados apenas em runtime.** A segurança de tipos nos destinos é inferior à da abordagem A.
- **A identidade da lib dilui-se.** Passa a ser "um wrapper de XState para navegação", e a pergunta "porque não usar XState diretamente?" torna-se legítima.
- **A migração da v2 é mais disruptiva.** Os conceitos e o vocabulário mudam (send/events em vez de dispatch/actions).

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Back/histórico com comportamento estranho em casos limite | Testes de caracterização da v2 a correr também contra o builder |
| Breaking changes do XState | Dependência em `peerDependencies` com range fixo e testes de contrato |
| Bundle size em apps simples | Oferecer `react-flow-app/lite` (motor simples) e `react-flow-app/xstate` (avançado). Na prática acaba por ser a abordagem A + B |

## Esforço estimado

Médio: builder + pilha de histórico (≈ 2 semanas), binding React (≈ 1), Mermaid + integração com o inspector (≈ 0,5), testes e docs (≈ 1–2). Exige mais tempo de prototipagem para validar o back dinâmico antes de avançar.

## Fontes

- [Stately — Graph utilities (`getShortestPaths`, `getSimplePaths`)](https://prod.stately.ai/docs/graph)
- [Stately — XState test (agora parte de @xstate/graph)](https://stately.ai/docs/xstate-test)
- [Tessl — XState 5.21 graph utilities (`createTestModel`)](https://tessl.io/registry/tessl/npm-xstate/5.21.0/files/docs/graph-utilities.md)
- [XState v5 state machines for UI (2026)](https://blog.codercops.com/blog/xstate-v5-state-machines-ui-2026)
- [devcompare — tamanho do bundle do xstate 5.x](https://devcompare.5-101-118-104.sslip.io/compare/react-redux-vs-xstate)
- [statelyai/xstate no GitHub](https://github.com/statelyai/xstate)
