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

## Objetivos usados na avaliação

1. **API mais simples** para o dev que usa a lib.
2. **Mapeamento de ecrãs em diagrama**, fiável e sem efeitos secundários.
3. **Melhores testes**, tanto da lib como das apps que a usam.
4. **Melhor controlo do desenvolvimento**: validação estática, CI e deteção de erros cedo.

Critérios adicionais de arquitetura: manutenção e suporte, escalabilidade (muitos flows/ecrãs), fidelidade às funcionalidades da v2, bundle e dependências, e custo de migração.

## Matriz de avaliação

Escala de 1 (fraco) a 5 (forte).

| Critério | Peso | A — Grafo declarativo | B — XState | C — Sobre router |
|---|:-:|:-:|:-:|:-:|
| API simples (caso comum: wizard/flow linear) | 3 | **5** | 2 | 3 |
| API para regras complexas (guards, async, paralelo) | 1 | 3 | **5** | 3 |
| Diagrama fiável e sem execução de código | 3 | **5** | **5** | 4 |
| Diagrama interativo / devtools "de graça" | 1 | 2 | **5** | 3 |
| Testabilidade (core puro, rápido, determinístico) | 2 | **5** | **5** | 3 |
| Geração de caminhos / model-based testing | 2 | 4 (próprio) | **5** (`xstate/graph`) | 4 (próprio) |
| Segurança de tipos nos destinos (erro de compilação) | 2 | **5** | 3 (runtime) | **5** |
| Fidelidade à semântica de histórico da v2 | 3 | **5** | 3 | 2 |
| URL / deep link / back do browser / SSR | 2 | 3 | 3 | **5** |
| Manutenção para a equipa da lib (menos código próprio) | 2 | 2 | **4** | 3 |
| Dependências / bundle | 1 | **5** (0 deps) | 2 (~14 kB gz) | 3 (router é peer) |
| Plataformas (RN, sem router, flows embebidos) | 1 | **5** | **5** | 2 |
| Custo de migração a partir da v2 | 2 | **4** | 2 | 1 |
| Identidade/diferenciação da lib | 1 | **5** | 2 | 4 |
| **Total ponderado** (máx. 130) | | **111** | **93** | **84** |

> Os pesos refletem os 4 objetivos (API simples, diagrama, testes, controlo) e a preservação do que torna a lib útil hoje: a semântica de histórico. Com outros pesos o resultado muda. Por exemplo, se o URL e o SSR forem prioridade máxima, a abordagem C sobe bastante.

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

1. **Core headless com grafo declarativo** (A). É o melhor resultado nos 4 objetivos e mantém a semântica da v2.
2. **Exportador `toXStateMachine(flows)`** (barato, só leitura). Abre o grafo no Stately visualizer/inspector e permite usar `xstate/graph` para gerar caminhos, sem tornar o XState uma dependência de runtime. Fica com o melhor de B para diagrama e testes.
3. **Adaptadores de router opcionais numa fase posterior** (C). O core expõe uma interface `HistoryAdapter` (`memory` | `hash` | `browser` | `tanstack-router` | `react-router`). Quem quiser URLs reais e SSR liga um adaptador. Quem tem flows embebidos ou React Native usa `memory`.

### Pré-requisitos antes de escrever o core

- [ ] **Testes de caracterização da v2 na `main`.** Cobrir `ignoreHistory`, `clearHistory`, `allowCyclicHistory`, `checkpoint`, `fromFlow`/`backExit`, ordem dos eventos, `scrollRestoration` e `initialHistory`. São o contrato de compatibilidade.
- [ ] **Separar as mudanças de tooling** (pnpm, Vitest, Biome) num PR próprio, sem alterações de comportamento.
- [ ] **Escrever um spike de tipos**: `defineFlows` + `branch` + `goto`, com testes `expectTypeOf` e um benchmark de `tsc` com 50 flows / 300 ecrãs.

### Plano incremental proposto

1. Tooling (PR isolado).
2. Testes de caracterização da v2.
3. Core headless (A) a passar esses testes + adaptador `fromV2()`.
4. Binding React: store por Provider, `useFlowSelector`, View Transitions, a11y opcional.
5. `toGraph`, `toMermaid`, `validateFlows`, CLI `check` e `getPaths`.
6. `toXStateMachine` + devtools com xyflow/elk.
7. Guia de migração v2 → v3 e versão `3.0.0-rc`.
8. (Opcional) adaptadores de router.

## Questões em aberto

- Os parâmetros de rota (`:orderId`) ficam no passo ou passam a ser estado do flow?
- Os modais (`anotherObjects` da v2) contam como nós do grafo ou ficam como "overlays" fora dele?
- Qual é o nível de suporte a SSR: só render inicial, ou hidratação do estado do flow?
- A v2 continua a receber correções durante quanto tempo após a v3?
