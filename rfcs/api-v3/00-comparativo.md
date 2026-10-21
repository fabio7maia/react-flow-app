# API v3 — Comparativo das 3 abordagens

> Contexto: o PR #63 propôs uma reescrita (`defineScreens` / `defineFlow` / `createFlowApp`) com 4 objetivos. A revisão desse PR mostrou que a direção é boa, mas há problemas de fundo:
>
> - o grafo não é analisável sem executar funções;
> - a semântica de histórico regrediu (`ignoreHistory`, `clearHistory`, ciclos);
> - há uma store singleton partilhada;
> - os alvos das transições não são tipados.
>
> Este documento compara três caminhos possíveis.

| Abordagem | Documento |
|---|---|
| **A** — Motor próprio com grafo declarativo | [01-grafo-declarativo.md](./01-grafo-declarativo.md) |
| **B** — Flows como máquinas de estados (XState v5) | [02-maquina-de-estados-xstate.md](./02-maquina-de-estados-xstate.md) |
| **C** — Camada de flows sobre um router (TanStack / React Router) | [03-camada-sobre-router.md](./03-camada-sobre-router.md) |

## Prioridades (confirmadas pelo maintainer)

Por ordem de importância:

1. **Navegação por eventos.** A ação do utilizador (`dispatch('pay')`) é a primitiva de navegação, e não o URL.
2. **Capturar todas as navegações e integrar com ferramentas terceiras** (analytics, logging, monitorização), com um único ponto de integração.
3. **Diagrama com os vários fluxos**, incluindo as ligações entre flows.
4. **Testes automáticos sobre os fluxos criados** e mais agilidade nos testes (rápidos, sem browser).
5. **Tipagem ponta a ponta com intellisense**: ecrãs, ações, payloads, destinos, eventos e metadados, sem genéricos escritos à mão.

Critérios secundários: simplicidade da API, fidelidade à semântica de histórico da v2, manutenção, URL/SSR, custo de migração e dependências.

## Matriz de avaliação

Escala de 1 (fraco) a 5 (forte). Os pesos seguem as prioridades acima: 3 nas prioridades 1–5 e 1–2 nos critérios secundários.

| Critério | Peso | A — Grafo declarativo | B — XState | C — Sobre router |
|---|:-:|:-:|:-:|:-:|
| **1. Navegação por eventos** (ação como primitiva única) | 3 | **5** | 4 | 3 ¹ |
| **2. Captura de navegações + integração terceiros** | 3 | **5** | 4 ² | 3 ¹ |
| **3. Diagrama multi-fluxo** (sem executar código, com cross-flow) | 3 | **5** | 4 ³ | 4 |
| **4a. Testes gerados a partir dos fluxos** | 3 | 4 | **5** | 3 |
| **4b. Agilidade dos testes** (Node puro, sem DOM/router) | 2 | **5** | **5** | 2 |
| **5. Tipagem ponta a ponta / intellisense** | 3 | **5** | 3 ⁴ | 4 ⁵ |
| Fidelidade à semântica de histórico da v2 | 2 | **5** | 3 | 2 |
| Simplicidade da API (caso comum) | 2 | **5** | 2 | 3 |
| Manutenção (menos código próprio) | 1 | 2 | **4** | 3 |
| URL / deep link / SSR | 1 | 3 | 3 | **5** |
| Custo de migração a partir da v2 | 1 | **4** | 2 | 1 |
| Dependências / bundle | 1 | **5** | 2 | 3 |
| **Total ponderado** (máx. 125) | | **116** | **91** | **77** |

1. Em C a navegação também acontece por fora dos eventos (`<Link>`, URL escrito à mão, back do browser). Os eventos deixam de ser a fonte única de verdade, e o analytics recebe "mudou de rota" em vez de "o utilizador fez `pay`".
2. O `inspect` do XState captura tudo, mas em formato genérico (`@xstate.event`, `@xstate.snapshot`). É preciso uma camada para traduzir para eventos de domínio (`step:enter`, `action`).
3. O diagrama do Stately é excelente para uma máquina, mas muitos flows numa única máquina raiz fica pesado. O back dinâmico também não se representa.
4. Eventos e guards são tipados, mas os alvos (`'#app.auth.login'`) só são validados em runtime. A ligação ecrã ↔ estado é manual.
5. Rotas e params são muito bem tipados pelo router, mas há duplicação entre rota e passo, e os payloads das ações não fazem parte do modelo do router.

> Com estas prioridades a diferença aumenta a favor de A. As prioridades 1, 2 e 5 dependem de a lib ser dona do modelo de eventos e dos tipos, e é isso que B e C delegam.

## Contrato de eventos (prioridades 1 e 2)

Seja qual for a abordagem, o modelo de eventos deve ser desenhado como um **contrato público e estável**, porque é o que as integrações de terceiros vão consumir. A versão abaixo (v1) está implementada no spike e fixada em [`tests/events.contract.test.ts`](../../spikes/api-v3-types/tests/events.contract.test.ts): qualquer alteração de nomes, campos ou ordem aparece como diff nesse teste.

```ts
type FlowEvent =
	| { type: 'flow:start'; source: 'initial' | 'api' | 'goto' | 'back' }
	| { type: 'action'; action; payload; overlay? } // o utilizador fez algo; payload tipado pela ação
	| { type: 'step:leave'; reason: 'dispatch' | 'back' | 'exit' | 'start' }
	| { type: 'flow:exit'; reason: 'goto' | 'back' | 'exit' | 'start' } // v2: backExit / onFlowUnmount
	| { type: 'step:enter'; direction: 'forward' | 'back'; from?: { flow; step }; meta? } // meta tipada pelo Register
	| { type: 'back:empty' } // back() sem histórico: a app decide (fechar a webview, etc.)
	| { type: 'action:unhandled'; action }; // ação sem transição (útil em dev/CI)

// Campos comuns a todos: flow, step, navigationId, timestamp, url (do passo a que o evento se refere)
```

Cada evento tem também um tipo com nome (`StepEnterEvent<F>`, `ActionEvent<F>`, …). Quem precisa de um só não paga um `Extract` sobre a union inteira: com 1000 ações, cada `Extract` custava ~1,5M instanciações no type-check.

### Ordem por tipo de navegação

| Navegação | Eventos (todos com o mesmo `navigationId`) |
| --- | --- |
| Arranque | `flow:start(initial)` → `step:enter` |
| Ação no mesmo flow | `action` → `step:leave(dispatch)` → `step:enter(forward)` |
| Ação com `goto` para outro flow | `action` → `step:leave(dispatch)` → `flow:exit(goto)` → `flow:start(goto)` → `step:enter(forward)` |
| `goto.exit()` | `action` → `step:leave(exit)` → `flow:exit(exit)` → `flow:start(back)` → `step:enter(back)` |
| `back()` no mesmo flow | `step:leave(back)` → `step:enter(back)` |
| `back()` para outro flow | `step:leave(back)` → `flow:exit(back)` → `flow:start(back)` → `step:enter(back)` |
| `start()` com um flow ativo | `step:leave(start)` → [`flow:exit(start)` → `flow:start(api)`] → `step:enter(forward)` |
| `back()` sem histórico | `back:empty` |
| Ação sem transição | `action:unhandled` |
| Ação com `effect` | `action` |

### Garantias

- **Ordem determinística**, conforme a tabela. O PR #63 emitia `mount` antes de `dispatch`, o que baralha funis de analytics.
- **Um `navigationId` por navegação**, partilhado por todos os seus eventos e estritamente crescente. Serve para correlacionar eventos e medir o tempo entre `action` e `step:enter` (inclui o lazy loading).
- **Run-to-completion**: uma navegação pedida dentro de um listener (ex.: um guard que redireciona no `step:enter`) só corre depois de a atual entregar todos os eventos. Dentro do listener, o estado ainda é o da navegação atual.
- **Ordem de entrega**: listeners do tipo, depois `'*'`, depois as integrações da app.
- **`url` do passo a que o evento se refere**, já com os parâmetros desse passo. `step:leave` e `flow:exit` levam o URL de onde se sai; `flow:start` e `step:enter`, o de onde se entra.
- **Isolamento de erros**: uma integração que lança exceção não parte a navegação nem as outras integrações.
- **Arranque sem perdas**: o `FlowProvider` retém os eventos do arranque até os filhos e adaptadores estarem ligados, por isso o primeiro page view não se perde.
- **Metadados tipados por ecrã**, com o tipo declarado uma vez pela app:

```ts
declare module 'react-flow-app' {
	interface Register {
		app: typeof flowApp; // ativa intellisense global em goto, useFlowEvents, start, analytics…
		meta: { title: string; funnel?: 'checkout' | 'onboarding' };
	}
}
```

### Analytics (adaptador oficial)

Validado com adaptadores para GA4 (`gtag.js`) e Segment (`analytics.js`) por cima de um `analytics(sink)` genérico:

```ts
const adapters = [
	browserHistory(),
	segment({
		// page view em cada step:enter (título = meta.title) e funis (Flow Started / Flow Exited)
		actions: {
			// Opt-in: só as ações listadas saem, com o que o mapeamento escolhe do payload (PII)
			checkout: payload => ({ name: 'Checkout Started', properties: { loggedIn: payload.loggedIn } }),
			finish: 'Order Completed',
		},
		enabled: () => consent.analytics, // consentimento: nada sai enquanto for false
	}),
];
```

Decisões que saíram da validação:

- **É um adaptador do Provider, não uma integração da app.** As integrações são tipadas pelo próprio `createFlowApp`. Usar ali tipos do `Register` criava um ciclo, porque o `Register` depende do `flowApp`.
- **`path` é o caminho do passo** (`/checkout/pay/42`), independente do modo hash/path do browser. O GA4 ignora o hash, por isso é este caminho que dá relatórios úteis.
- **GA4 numa SPA**: o page view automático tem de estar desligado (`send_page_view: false` e "page changes based on browser history events" desligado), senão conta a dobrar.
- **O SDK é resolvido em cada chamada**, porque os snippets do GA4 e do Segment podem carregar depois do arranque ou ser bloqueados por um ad blocker.
- **Middleware (guards, redirecionar, bloquear navegação) fica fora da v1.** O caso "redirecionar" já é possível com um listener, graças ao run-to-completion. Um evento `navigation:blocked` só entra quando houver guards.

## Testes (prioridade 4)

A abordagem recomendada deve trazer um pacote `react-flow-app/testing`:

- **`createFlowTester(flows)`** corre o motor em Node puro, grava os eventos e expõe asserções (`expectStep`, `expectEvents`). Os testes correm em milissegundos.
- **`getPaths(flows, { strategy: 'shortest' | 'simple' })`** gera um teste por caminho no grafo.
- **Cobertura de transições:** um relatório de quais arestas do grafo foram exercidas pelos testes, que pode falhar o CI abaixo de um limiar. Responde à pergunta "que navegações não estão testadas?".
- **Snapshot do grafo:** `expect(toMermaid(flows)).toMatchSnapshot()`. Qualquer alteração aos fluxos aparece no diff do PR como diagrama.
- **`validateFlows(flows)`** como teste/CLI: passos inalcançáveis, ações sem transição, entrypoints duplicados, flows sem saída.

## Comparação lado a lado — o mesmo caso de uso

**Transição condicional `payment --pay--> success | failure`:**

| A | B | C |
|---|---|---|
| `pay: branch(['success','failure'], (_, p) => p.ok ? 'success' : 'failure')` | `pay: [{ target: 'success', guard: 'paymentOk' }, { target: 'failure' }]` | `pay: branch(['success','failure'], (_, p) => p.ok ? 'success' : 'failure')` + `to: '/checkout/success'` em cada passo |

**Voltar atrás:**

| A | B | C |
|---|---|---|
| `back()` sobre a pilha controlada pela lib (semântica v2) | `send({ type: 'BACK' })`, emulado com uma pilha no `context` | `history.back()`. Casos especiais emulados com `history.go(-n)` |

**Onde vive o URL:**

| A | B | C |
|---|---|---|
| Na lib (hash/path, `replaceState` + `popstate`) | Na lib (igual a A) | No router |

**Como se testa uma navegação:**

| A | B | C |
|---|---|---|
| `createFlowEngine(flows).dispatch(...)` em Node puro | `createActor(machine).send(...)` em Node puro | Router com memory history + render |

**Como se obtém o diagrama:**

| A | B | C |
|---|---|---|
| `toGraph(flows)` → Mermaid / xyflow | Stately Studio/inspector + `toMermaid(machine)` | `toMermaid(flows, { showRoutes: true })` |

## Leitura por perspetiva

### Arquiteto (desenvolvimento, suporte, escalabilidade)

- **A** dá o maior controlo e a menor superfície de dependências. Em contrapartida, todo o código é da equipa. O risco principal é a capacidade de manutenção, mitigável com scope bem fechado (sem guards async nem paralelismo no core).
- **B** delega o motor num projeto maduro e reduz o código próprio. O preço é que o modelo (alvos estáticos) choca com o requisito central (pilha de navegação dinâmica), e a lib fica dependente do roadmap da Stately.
- **C** delega o URL, que tem sido historicamente a fonte de bugs (ver as branches `bugfix/*` com replaceState, file protocol, re-render no back). O preço é o acoplamento a routers e a perda de controlo sobre o histórico, que é precisamente o ponto forte da v2.

### Dev que usa a lib

- **A**: "declaro ecrãs, passos e transições, faço `dispatch('acao')`". É o mais próximo do modelo mental da v2 e tem o melhor autocomplete.
- **B**: poderoso quando o fluxo tem regras de negócio pesadas, mas obriga a pensar em eventos, guards e estados. Um wizard simples fica verboso.
- **C**: natural para quem já usa TanStack ou React Router, mas obriga a declarar rotas **e** flows, e alguns comportamentos de histórico ficam "best effort".

## Recomendação

**Avançar com a abordagem A como base**, desenhada para não fechar portas a B e C:

1. **Core headless com grafo declarativo** (A). É o melhor resultado nas 5 prioridades e mantém a semântica da v2. A lib é dona do contrato de eventos e dos tipos, que são o centro das prioridades 1, 2 e 5.
2. **Exportador `toXStateMachine(flows)`** (barato, só leitura). Abre o grafo no Stately visualizer/inspector e permite usar `xstate/graph` para gerar caminhos, sem tornar o XState uma dependência de runtime. Fica com o melhor de B para diagrama e testes.
3. **Adaptadores de router opcionais numa fase posterior** (C). O core expõe uma interface `HistoryAdapter` (`memory` | `hash` | `browser` | `tanstack-router` | `react-router`). Quem quiser URLs reais e SSR liga um adaptador. Quem tem flows embebidos ou React Native usa `memory`.

### Pré-requisitos antes de escrever o core

- [x] **Testes de caracterização da v2** (PR #67, na branch `v3`: nada vai para a `main` nesta fase). Cobrir `ignoreHistory`, `clearHistory`, `allowCyclicHistory`, `checkpoint`, `fromFlow`/`backExit`, ordem dos eventos, `scrollRestoration` e `initialHistory`. São o contrato de compatibilidade.
- [ ] **Separar as mudanças de tooling** (pnpm, Vitest, Biome) num PR próprio, sem alterações de comportamento.
- [x] **Escrever um spike de tipos**: `defineFlows` + `branch` + `goto` + `Register`, com testes `expectTypeOf` e um benchmark de `tsc` com 50 flows / 300 ecrãs.
- [x] **Fechar o contrato de eventos** (tipos, ordem, campos comuns) e validá-lo com adaptadores de analytics reais (GA4 e Segment). Ver [Contrato de eventos](#contrato-de-eventos-prioridades-1-e-2).

### Plano incremental proposto

1. Tooling (PR isolado).
2. Testes de caracterização da v2.
3. Core headless (A) a passar esses testes + adaptador `fromV2()`.
4. Binding React: store por Provider, `useFlowSelector`, View Transitions, a11y opcional.
5. `react-flow-app/testing` (`createFlowTester`, `getPaths`, cobertura de transições), `toGraph`, `toMermaid`, `validateFlows` e CLI `check`.
6. Middleware + adaptadores oficiais de analytics (GA4, Segment) + `logger`.
7. `toXStateMachine` + devtools com xyflow/elk.
8. Guia de migração v2 → v3 e versão `3.0.0-rc`.
9. (Opcional) adaptadores de router.

## Decisões tomadas

- **Retomar um flow no passo onde estava** (v2: `navigateTo()` sem passo) mantém-se: `goto(flow)` e `start(flow)` sem passo retomam o último passo desse flow, ou o inicial se o flow nunca foi visitado.
- **Os modais (`anotherObjects` da v2) mantêm-se como overlays**: declarados no flow (`overlays: { help: helpScreen }`), com transições no mesmo `transitions()`, nós próprios no grafo e incluídos na validação. Não são passos (não entram no histórico).

## Questões em aberto

- Os parâmetros de rota (`:orderId`) ficam no passo ou passam a ser estado do flow?
- Qual é o nível de suporte a SSR: só render inicial, ou hidratação do estado do flow?
- A v2 continua a receber correções durante quanto tempo após a v3?
