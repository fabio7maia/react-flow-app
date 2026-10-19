# Abordagem C — Camada de flows sobre um router (TanStack Router / React Router)

> Parte de um conjunto de 3 abordagens para a v3 do `react-flow-app`. Ver [comparativo](./00-comparativo.md).

## Resumo

Deixar de gerir a navegação e o URL dentro da lib. **Cada passo passa a ser uma rota real** do router da aplicação. O `react-flow-app` fica como uma **camada de orquestração** com três responsabilidades:

1. Declarar quais rotas formam um flow e qual é o grafo de transições entre elas (actions → rotas).
2. Expor `dispatch(action)`, que resolve o destino e chama o `navigate()` do router (`push` ou `replace`, consoante as regras de histórico).
3. Proteger o flow: impedir deep links para passos que não são `entrypoint` e redirecionar quando o estado do flow é inválido (ex.: chegar ao `payment` sem passar pelo `cart`).

O router fica com o URL, o botão back do browser, o deep linking, o SSR, o code-splitting e os parâmetros tipados. A lib fica com o grafo, o diagrama, a validação, os testes e os eventos de analytics.

O desenho é feito com **adaptadores**: `@react-flow-app/tanstack-router` e `@react-flow-app/react-router`, sobre um core comum, o que permite suportar mais de um router.

## Inspiração na comunidade

| Projeto | O que aproveitar |
|---|---|
| **TanStack Router** | Rotas e params 100% tipados, `validateSearch` com schema, loaders e `beforeLoad` para guards |
| **React Router v7** | Route config (`routes.ts`), typegen, `href()` tipado, `useBlocker` para confirmar a saída de um flow |
| react-declarative `WizardView` | Wizard em que cada passo é uma rota com `history.replace`. Deep link e Back funcionam "out of the box" |
| Android Navigation / Expo Router | Grafo de navegação declarativo por cima de destinos com URL/deep link |

## Exemplo (TanStack Router)

O cenário é o mesmo das outras abordagens: checkout (`cart → payment → success | failure`), com salto para auth.

### 1. Rotas (do router, como hoje em qualquer app)

```ts
// routes.ts
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { z } from 'zod';

const root = createRootRoute();
const checkout = createRoute({ getParentRoute: () => root, path: 'checkout' });

export const cartRoute = createRoute({ getParentRoute: () => checkout, path: 'cart' }).lazy(() =>
	import('./screens/Cart').then((m) => m.Route),
);
export const paymentRoute = createRoute({
	getParentRoute: () => checkout,
	path: 'pay/$orderId',
	validateSearch: z.object({ coupon: z.string().optional() }),
}).lazy(() => import('./screens/Payment').then((m) => m.Route));
export const successRoute = createRoute({ getParentRoute: () => checkout, path: 'success' });
export const failureRoute = createRoute({ getParentRoute: () => checkout, path: 'failure' });
export const loginRoute = createRoute({ getParentRoute: () => root, path: 'auth/login' });

export const router = createRouter({ routeTree: root.addChildren([/* ... */]) });
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
```

### 2. Flows (camada da lib)

```ts
// flows.ts
import { defineFlows, branch } from '@react-flow-app/tanstack-router';

export const flows = defineFlows({
	checkout: {
		steps: {
			cart: { to: '/checkout/cart', initial: true, entrypoint: true, actions: ['checkout'] },
			payment: { to: '/checkout/pay/$orderId', actions: ['pay', 'cancel'] },
			success: { to: '/checkout/success', actions: ['finish'], clearHistory: true },
			failure: { to: '/checkout/failure', actions: ['retry'], ignoreHistory: true },
		},
		// `to` é tipado pelo router registado: um path inexistente não compila
		transitions: {
			cart: {
				checkout: branch(['payment', 'auth.login'], ({ session }) => (session ? 'payment' : 'auth.login')),
			},
			payment: {
				pay: branch(['success', 'failure'], (_, p: { ok: boolean }) => (p.ok ? 'success' : 'failure')),
				cancel: 'cart',
			},
			failure: { retry: 'payment' },
			success: { finish: { to: '/' } }, // saída do flow para uma rota "normal"
		},
	},
	auth: {
		steps: { login: { to: '/auth/login', initial: true, entrypoint: true, actions: ['loggedIn'] } },
		transitions: { login: { loggedIn: 'exit' } }, // volta ao passo que abriu o flow
	},
});
```

### 3. Ligação ao router e ecrãs

```tsx
// app.tsx
import { RouterProvider } from '@tanstack/react-router';
import { FlowsProvider } from '@react-flow-app/tanstack-router';

export function App() {
	return (
		<FlowsProvider flows={flows} router={router} onEvent={(e) => analytics.track(e)}>
			<RouterProvider router={router} />
		</FlowsProvider>
	);
}

// screens/Payment.tsx
import { createLazyRoute } from '@tanstack/react-router';
import { useFlow } from '@react-flow-app/tanstack-router';

export const Route = createLazyRoute('/checkout/pay/$orderId')({ component: Payment });

function Payment() {
	const { orderId } = Route.useParams(); // tipado pelo router
	const { dispatch, back } = useFlow('checkout', 'payment'); // actions: 'pay' | 'cancel'
	return <button onClick={() => dispatch('pay', { ok: true }, { params: { orderId } })}>Pagar</button>;
}
```

Guard de entrada gerado pela lib e aplicado no `beforeLoad` de cada rota do flow:

```ts
// Gerado por flows.attach(router): se o utilizador abrir /checkout/success diretamente
// e "success" não for entrypoint, redireciona para o passo inicial do flow.
beforeLoad: flowGuard(flows, 'checkout', 'success');
```

### 4. Regras de histórico sobre o histórico do browser

| Opção | Implementação |
|---|---|
| passo normal | `navigate({ to })` → push |
| `ignoreHistory` | ao sair do passo: `navigate({ to, replace: true })` |
| `clearHistory` | **não é possível apagar o histórico do browser**. Emulação: marca o índice no `history.state` e o `back` intercetado (`useBlocker`/`popstate`) salta para fora do flow |
| `allowCyclicHistory` / `checkpoint` | `history.go(-n)` calculado a partir da pilha que a lib guarda em `sessionStorage` |
| back para fora do flow (`backExit`) | `history.back()` natural |

### 5. Diagrama

A lib conhece o grafo (`flows`) e o router conhece a árvore de rotas. Com as duas fontes:

```ts
import { toMermaid } from '@react-flow-app/core/diagram';
toMermaid(flows, { showRoutes: true }); // nós com o path real: payment (/checkout/pay/$orderId)
```

O diagrama pode incluir também as rotas que **não** pertencem a nenhum flow, o que dá um mapa completo da app. A extensão TanStack Router Devtools mostra o estado da rota, e os devtools do flow (xyflow) mostram o grafo.

### 6. Validação e testes

- **Compilação:** `to` só aceita paths registados no router, e as actions vêm de `steps.<x>.actions`.
- **`validateFlows(flows, router)`:** verifica que todas as rotas existem, que nenhuma rota pertence a dois flows, que os entrypoints não colidem e que não há passos inalcançáveis.
- **Testes de integração com memory history:**

```ts
import { createMemoryHistory, createRouter } from '@tanstack/react-router';

it('deep link para success redireciona para cart', async () => {
	const r = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/checkout/success'] }) });
	render(<App router={r} />);
	await waitFor(() => expect(r.state.location.pathname).toBe('/checkout/cart'));
});
```

- A geração de caminhos (`getPaths(flows)`) funciona como na abordagem A, porque o grafo é declarativo.

## Mapeamento das funcionalidades da v2

| v2 | Abordagem C |
|---|---|
| `baseUrl` + `url` do passo + `withUrl` | Rotas do router (o URL passa a ser sempre real) |
| `TStepOptions` | Mantidas, mas implementadas sobre o histórico do browser (ver tabela acima) |
| Lazy loading via `loader` | Lazy routes do router |
| `listen`, `onFlowMount/Unmount` | `onEvent` + subscrição ao router (`router.subscribe('onResolved')`) |
| `scrollRestoration` | Nativa do router |
| Flows sem URL (`withUrl: false`, ex.: um wizard dentro de um modal) | **Não suportado diretamente.** Precisa de memory history num sub-router ou da abordagem A como fallback |

## Prós

- **URL, back/forward do browser, deep link, refresh, SSR e scroll restoration nativos e robustos.** Tudo isto deixa de ser código da lib. Era uma fonte histórica de bugs (ver a sequência de branches `bugfix/*` no repo).
- **Encaixa na arquitetura que as apps já usam.** Ninguém tem de escolher entre "router" e "react-flow-app".
- **Tipos de rotas e params de primeira classe**, mantidos pelo TanStack ou pelo Remix.
- **A lib fica pequena e focada** no que é diferenciador: grafo de ações, regras de histórico, guards de flow, diagrama e analytics.
- **O mapa de ecrãs é o mais completo**, porque inclui rotas fora de flows.

## Contras

- **O histórico do browser não é uma pilha controlável.** `clearHistory`, `checkpoint` e ciclos ficam emulados e frágeis (`history.go(-n)`, `sessionStorage`). É a semântica onde a v2 é mais forte, e fica pior aqui.
- **Acoplamento ao router.** Cada router precisa do seu adaptador, a manter a par das versões e breaking changes. Apps sem router, React Native ou micro-frontends perdem suporte.
- **Os flows embebidos** (wizard num modal ou num painel, sem URL) deixam de ser triviais.
- **Mais "cerimónia" de setup.** É preciso definir rotas **e** flows, com duplicação parcial (path + step).
- **Os testes precisam de um router em memória.** São mais lentos e com mais setup do que um core puro.
- **É a migração mais disruptiva da v2.** Cada passo tem de passar a rota.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Emulação de `clearHistory` inconsistente entre browsers | Documentar como "best effort", com testes e2e (Playwright) em Chromium, Firefox e WebKit |
| Divergência entre adaptadores | Core comum + suite de testes de contrato partilhada pelos adaptadores |
| Utilizadores sem router | Manter o core da abordagem A com adaptador "memory" (sem URL) |

## Esforço estimado

Médio-alto: core do grafo (≈ 1–2 semanas, partilhável com a abordagem A), adaptador TanStack (≈ 2), adaptador React Router (≈ 2), emulação de histórico + e2e (≈ 1–2), docs e migração (≈ 1–2).

## Fontes

- [TanStack Router — search params tipados com `validateSearch`](https://tanstack.com/router/latest/docs/how-to/setup-basic-search-params)
- [TanStack Router v1 — file-based routing tipado (2026)](https://noqta.tn/en/tutorials/tanstack-router-v1-type-safe-file-based-routing-react-2026)
- [React Router — `useBlocker`](https://reactrouter.com/7.5.3/api/hooks/useBlocker.md)
- [React Router 7 — novidades (typegen, route config)](https://www.syncfusion.com/blogs/post/whats-new-react-router-7)
- [react-declarative WizardView (passos como rotas)](https://tripolskypetr-react-declarative-docs.static.hf.space/documents/docs_components_wizard.html)
