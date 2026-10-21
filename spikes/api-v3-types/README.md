# Spike — API v3 (abordagem A, ecrãs e flows em ficheiros separados)

> Protótipo descartável para validar o [RFC da abordagem A](../../rfcs/api-v3/01-grafo-declarativo.md). Não é código de produção, nem faz parte do build da lib.

## Objetivo

Confirmar, com código a compilar e a correr, que a abordagem A cumpre as prioridades com **um ficheiro por ecrã, um ficheiro por flow e a composição num terceiro ficheiro**:

1. navegação por eventos;
2. capturar as navegações e integrar com terceiros (analytics);
3. diagrama com os vários flows;
4. testes automáticos sobre os flows e agilidade nos testes;
5. tipagem ponta a ponta com intellisense, sem genéricos escritos à mão;

e que mantém o comportamento da v2 (paridade com os testes de caracterização).

## Como correr

Usa as dependências da raiz do repo (TypeScript 5.8, React 19, jsdom, esbuild). O único pacote próprio é o `playwright-core`, para o e2e (`npm install` nesta pasta; usa os browsers que o Playwright já tem em cache, não descarrega nenhum).

```bash
npm run typecheck      # tipos + testes de tipos
npm test               # 107 testes em Node: engine, contrato de eventos, paridade com a v2, adaptadores, analytics, render React (jsdom)
npm run completions    # intellisense real (language service do TypeScript)
npm run bench -- 50 6  # benchmark de type-check: 50 flows × 6 passos
npm run e2e            # 7 cenários × 2 browsers reais (Chromium do Playwright + Chrome do sistema)
```

## Estrutura

```
lib/                        protótipo da lib ('react-flow-app' via tsconfig paths)
  types.ts                  ecrãs, ações, payloads, transições, alvos
  screen.ts                 defineScreen, payload
  flow.ts                   defineFlow (passos + overlays), goto, branch, effect, Register
  app.ts                    createFlowApp, contrato de eventos
  engine.ts                 motor headless (start, dispatch, back, eventos, cobertura)
  graph.ts                  toGraph, toMermaid, validateFlows, getPaths
  url.ts                    URL de cada passo (/baseUrl/url, :params tipados) e deep links (puro)
  adapters.ts               browserHistory (URL + back/forward do browser), scrollRestoration
  analytics.ts              analytics(sink) genérico + ga4() e segment() sobre o contrato de eventos
  react.tsx                 FlowProvider, useFlow, useFlowSelector, useFlowEvents, useStepParams
example/
  screens/<ecrã>/<ecrã>.screen.ts   definição (ações, payloads, meta, loader)
  screens/<ecrã>/<Ecrã>.tsx         componente (lazy)
  flows/<flow>.flow.ts              passos + transições
  app.flow.ts                       composição + Register
  analytics.ts                      o que vai para o analytics (page views, funis, ações opt-in)
  App.tsx, main.tsx                 Provider + adaptadores; entrada do browser (e2e)
tests/
  types.test-d.ts           41 asserções de tipos (27 erros esperados + 14 igualdades de tipo)
  engine.test.ts            26 testes do motor, grafo, validação, testes gerados e cobertura
  events.contract.test.ts   contrato de eventos v1: nomes, campos e ordem de cada tipo de navegação
  parity.test.ts            41 cenários de paridade com a v2 (mesmos IDs da caracterização)
  adapters.test.ts          15 testes de URL, deep links, back/forward do browser e scroll
  analytics.test.ts         GA4, Segment, ações opt-in, consentimento, SDK em baixo
  react.test.tsx            9 testes de render React real (jsdom, popstate real)
  fake-browser.ts, dom.ts   browser falso em memória; DOM jsdom para o React
e2e/browser.e2e.mjs         7 cenários em browsers reais (Playwright)
scripts/                    test, completions, bench, e2e
```

## Resultados

| Hipótese | Resultado |
|---|---|
| Ecrã num ficheiro, flow noutro, composição num terceiro | ✅ Funciona, com uma condição (ver descoberta 1) |
| `dispatch` tipado a partir do ecrã (ações, payload obrigatório/opcional, opções de navegação) | ✅ |
| Transições: só passos do flow, só ações do ecrã do passo | ✅ Erros claros, incluindo `Did you mean '"payment"'?` |
| `goto('flow', 'passo')` entre ficheiros, validado pelo `Register` | ✅ Sem imports circulares (ver descoberta 1) |
| Payload inferido dentro do `branch`; o `branch` só devolve alvos declarados | ✅ `(_, p) => p.ok` sem anotações |
| Exemplos de payload no `branch` (`samples`), com chaves e valores tipados | ✅ (ver descoberta 4) |
| Parâmetros de URL tipados (`'pay/:orderId'` → `{ orderId: string }`) | ✅ `start`, `urlOf`, `useStepParams` |
| Metadados tipados pela app (`Register['meta']`) | ✅ |
| Eventos tipados (`e.action === 'pay'` → `e.payload.ok`) | ✅ (ver descoberta 3) |
| Contrato de eventos v1 (nomes, campos, ordem) fixado em teste | ✅ Apanhou 2 bugs (ver descoberta 8) |
| Analytics real sobre o contrato (GA4 e Segment) | ✅ Page views, funis, ações opt-in tipadas, consentimento (ver descoberta 9) |
| Intellisense real em 12 pontos da API | ✅ 12/12 sugestões exatamente as esperadas |
| Grafo e Mermaid sem executar resolvers | ✅ |
| `validateFlows` (ações sem transição, inalcançáveis, sem inicial, branch sem exemplo) | ✅ |
| Testes gerados por caminho + relatório de cobertura de transições | ✅ Sem mapas escritos à mão |
| Overlays (v2: anotherObjects) e retoma de flows (v2: `navigateTo()` sem passo) | ✅ |
| URL nos eventos, deep links, botão back do browser, scroll restoration | ✅ (ver descoberta 5) |
| Render React real (lazy, Suspense, adaptadores, primeiro page view) | ✅ 9 testes; apanhou 2 bugs (ver descoberta 6) |
| Browsers reais (Chromium + Chrome) | ✅ 14/14, incluindo code-splitting real |
| Paridade com a v2 (41 cenários de caracterização) | ✅ 41/41: 21 iguais, 16 equivalentes, 4 divergências intencionais |
| Type-check com 1000 ecrãs | ✅ ~4,0 s, crescimento aproximadamente linear (ver descoberta 7) |

### Benchmark de type-check

Gerado por `scripts/bench.mjs`. Há um ficheiro por ecrã, por componente e por flow. Cada ecrã tem:
- uma ação com nome único;
- um `branch`;
- um `goto` para outro flow;
- um componente que usa `useFlow`.

A app gerada também usa `useFlowEvents`/`on` e o adaptador `segment()` com uma ação mapeada.

| Ecrãs | Ficheiros | Check time | Memória | Instanciações |
|---|---|---|---|---|
| 60 | 132 | 0,5 s | 105 MB | 70k |
| 300 | 652 | 1,4 s | 153 MB | 480k |
| 600 | 1302 | 2,4 s | 237 MB | 1,48M |
| 1002 | 2173 | 4,0 s | 334 MB | 3,69M |

Na mesma máquina, os tempos variam até cerca de ±0,7 s entre execuções. As comparações abaixo usam três execuções de cada versão.

## Descobertas que mudam o desenho do RFC

### 1. As transições têm de ser um statement separado do `defineFlow`

Validar `goto('auth', 'login')` contra o `Register` **dentro** do `defineFlow({ ..., transitions })` cria uma referência circular de tipos. O tipo do `checkoutFlow` depende do `goto`, o `goto` depende do `Register`, o `Register` depende do `flowApp`, e o `flowApp` depende do `checkoutFlow`. Foi testado com duas formas de registo (`Register { app }` e `interface Flows { checkout: typeof checkoutFlow }`), e ambas dão `TS7022`/`TS2502`. Sem registo não há ciclo, mas também não há autocomplete nem validação do `goto`, e o payload no `branch` passa a `unknown`.

A solução que funciona é declarar as transições num statement à parte:

```ts
export const checkoutFlow = defineFlow({ name: 'checkout', steps: { ... } });

checkoutFlow.transitions({
	cart: { checkout: branch(['payment', goto('auth', 'login')], (_, p) => ...) },
});
```

O tipo do flow passa a depender só dos `steps`. Como bónus, o `S` já está fixo quando as transições são verificadas, e isso faz funcionar a inferência do payload no `branch`. É, curiosamente, a mesma forma da v2 (`f0.step('screen1')({ ... })`). O `transitions()` devolve `void` de propósito, para desencorajar `defineFlow(...).transitions(...)` numa só expressão, que reintroduz o ciclo.

**Custo:** o TS deixa de poder verificar se todos os passos têm transições (a v2 verificava, ver caracterização). Isso passa para o `validateFlows` (`unhandled-action`).

### 2. O `loader` não pode exigir `ComponentType`

Com `loader: () => Promise<{ default: ComponentType }>`, o TS tem de inferir o tipo de retorno do componente para validar o loader. Como o componente usa `useFlow(paymentScreen)`, o tipo do `paymentScreen` passa a depender de si próprio (`TS7022`/`TS7023`). Só aparece em componentes cujo JSX depende do resultado do hook (ex.: `{canGoBack && ...}`). Por isso é traiçoeiro: funciona até deixar de funcionar.

**Solução:** `default: unknown` no tipo, mais uma verificação em runtime no `lazy`. A alternativa de obrigar o dev a anotar o retorno dos componentes foi rejeitada, por ser fricção constante.

### 3. A union de eventos não pode ser um produto cartesiano

A primeira versão gerava um membro por flow × passo × tipo de evento × ação. Com 300 ecrãs, **o check passou de 1,5 s para 8,6 s, e com 600 ecrãs para 35 s** (crescimento quadrático). Isolado por ablação: só o ficheiro que usa `on('action', e => ...)` era responsável.

**Solução:** um membro por tipo de evento e um membro por **nome de ação**, com o payload correlacionado com a ação. `flow` e `step` passam a ser unions simples.

**Custo:** `if (e.flow === 'checkout')` já não estreita `e.step` para os passos do checkout. Para analytics, o que importa (ação → payload) mantém-se.

### 4. Testes gerados precisam de exemplos de payload nos `branch`

O grafo mostra as duas arestas de `pay` (`success` e `failure`), mas para percorrer cada uma é preciso um payload que leve o resolver a escolhê-la. Os exemplos declaram-se no próprio `branch`:

```ts
pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure'), {
	samples: { success: { ok: true }, failure: { ok: false } },
}),
```

- As chaves são as dos alvos declarados (`'payment'`, `'auth.login'`, `'exit'`), com autocomplete. Os valores têm o tipo do payload da ação, e `NoInfer` evita que o payload seja inferido a partir dos exemplos.
- O grafo leva o exemplo em cada aresta, e o `getPaths` usa-o: os testes gerados deixam de precisar de um mapa escrito à mão.
- O `validateFlows` emite um aviso (`severity: 'warning'`, `branch-without-sample`) quando falta o exemplo de um alvo.

**Limitação conhecida:** um resolver **sem nenhum parâmetro** (`() => 'payment'`) devolve `string` e não o literal, porque o TS verifica-o antes de fixar os alvos (testado com `NoInfer` no retorno, sem efeito). Na prática, um resolver que usa `ctx` ou o payload funciona, e um `branch` que devolve sempre o mesmo alvo devia ser um destino direto.

### 5. URL e browser ficam fora do core, como adaptadores

O engine continua sem DOM (serve React Native e testes em Node). URL e scroll são adaptadores opcionais (`FlowAdapter`), ligados pelo `FlowProvider`: `<FlowProvider adapters={[browserHistory(), scrollRestoration()]} />`. Sem adaptadores, o engine não toca no browser (U02). O URL de cada passo é calculado no core (`url.ts`, puro), por isso os eventos levam sempre `url`, mesmo sem browser (útil para page views).

Política do `browserHistory` (a v2 só fazia `replaceState`, por isso o botão back do browser não navegava o flow):

| Situação | Comportamento |
|---|---|
| Avançar para um passo novo | `pushState`: o back do browser passa a funcionar |
| Sair de um passo `ignoreHistory`, cortar um ciclo, `clearHistory` | `replaceState`: o back do browser não volta a esse passo |
| Back do browser (`popstate`) | `engine.back()`. Os parâmetros do passo são repostos |
| Back do browser sem histórico no engine (ex.: depois de `clearHistory`) | O browser sai da app. Prender o utilizador num ciclo de back seria hostil |
| Back pela UI ou `goto.exit()` | `history.go(-1)`, para manter as pilhas alinhadas |
| Forward do browser | Não navega (o engine não tem "forward"); o URL do passo atual é reposto |
| Deep link para um passo `entrypoint` | Abre nesse passo, com os parâmetros extraídos do URL |
| Deep link para outro passo | Redireciona para o passo inicial desse flow |

Validado em três níveis:
- um browser falso em memória (15 testes);
- o histórico real do jsdom (render React);
- Chromium e Chrome reais (e2e).

Depois de cortes de histórico, a pilha do browser pode ter entradas a mais do que o engine. O adaptador lida com isso porque cada entrada guarda um índice crescente e o URL é corrigido no `popstate`.

A scroll restoration guarda a posição ao avançar e repõe-na ao voltar, quando o ecrã está de facto montado: um componente dentro do mesmo `Suspense` chama `screenReady()`, em vez dos 300 ms fixos da v2. Validado em Chrome real.

### 6. O render real apanhou dois bugs que os tipos não viam

1. **`<Analytics />` estava fora do `FlowProvider`.** O `FlowProvider` não aceitava `children`, por isso os hooks dos filhos rebentavam. Agora os `children` são renderizados dentro do contexto.
2. **O primeiro page view perdia-se.** O engine arrancava durante o render (`useState`) e emitia o `step:enter` inicial antes de os `useFlowEvents` dos filhos subscreverem (só as `integrations` da app o recebiam). Agora o estado inicial continua síncrono (primeiro render já com o ecrã, bom para SSR), mas os eventos do arranque ficam retidos (`deferStartEvents`) e são emitidos no `useEffect` do Provider. Os efeitos dos filhos correm antes, por isso já subscreveram. O e2e confirma que o primeiro page view chega ao analytics em Chrome real.

### 7. O `goto` era a parte que crescia mais do que linearmente

Uma ablação com 1000 ecrãs mostrou o `goto` como responsável pela maior parte das instanciações: cada chamada resolvia `FlowByName<F>` com um `Extract` sobre todos os flows registados. Agora usa um mapa `nome → flow` calculado uma única vez (acesso indexado). Com 1000 ecrãs, o check desceu de ~4,7 s para ~4,0 s (três execuções de cada versão) e as instanciações de 5,7M para 3,7M. A hipótese inicial (o `ActionPayloads` dos eventos) estava errada: mudá-lo não alterou nada, e ficou a versão mais simples.

### 8. Fechar o contrato apanhou dois bugs de ordem

O teste do contrato (`events.contract.test.ts`) compara a sequência completa de eventos, campo a campo, de cada tipo de navegação.

1. **O `flow:start` levava o URL errado.** Era emitido antes de o estado mudar, por isso calculava o URL do passo de destino com os parâmetros do passo anterior. Num deep link para `pay/:orderId`, saía `/checkout/pay/:orderId` em vez de `/checkout/pay/42`. Agora o estado muda primeiro.
2. **Um listener que navegava intercalava duas navegações.** Por exemplo, um guard que faz `dispatch('cancel')` no `step:enter`. Os eventos da segunda navegação saíam a meio da primeira e os `navigationId`s misturavam-se. Agora o engine é run-to-completion: a navegação pedida fica em fila e corre quando a atual termina. Dentro do listener, o estado ainda é o da navegação atual (documentado no contrato).

O render React apanhou um terceiro bug: o `FlowProvider` ligava os adaptadores uma vez, mas chamava `screenReady` nos adaptadores da renderização atual. Um pai que recriasse a lista em cada render partia a restauração do scroll sem erro. Agora os adaptadores ficam fixos na primeira renderização, como o `initial`.

### 9. Tipos do `Register` em módulos da lib custam mesmo sem serem usados

A primeira versão do `analytics.ts` acrescentava 4,6M instanciações com 1000 ecrãs (3,66M → 8,25M; check de ~4,0 s para ~5,5 s), **mesmo numa app que não usava analytics**. Os ficheiros da lib fazem parte do programa e são verificados com o `Register` da app. Por ablação, cada caso abaixo custava ~1,5M:

- um alias **não usado** com restrição `type EventOf<T extends RegisteredEvent['type']> = …`;
- `Extract<RegisteredEvent, { type: 'action' }>` dentro do mapped type das ações;
- estreitar o `RegisteredEvent` num `switch` na implementação.

A correção trouxe o custo de volta à base (3,69M, já com `segment()` em uso):

- cada evento passou a ter um tipo com nome (`StepEnterEvent<F>`, `ActionEvent<F>`…) e o `FlowEvent` é a união deles;
- o mapeamento de ações recebe um `ActionContext` simples em vez do evento extraído da union;
- a implementação usa o evento genérico, e os tipos do `Register` ficam só na assinatura pública.

Regra para a lib: nenhum tipo derivado do `Register` ao nível do módulo, fora de assinaturas genéricas. O benchmark deve usar cada API pública, para um custo destes aparecer logo.

O analytics é um **adaptador do Provider, não uma integração da app**. As integrações são tipadas pelo próprio `createFlowApp`, e usar ali tipos do `Register` criava um ciclo (o `Register` depende do `flowApp`).

## Paridade com a v2

Os 41 cenários dos testes de caracterização da v2 (`src/__tests__/characterization`, branch `test/v2-characterization`) foram reescritos com a API v3 em `tests/parity.test.ts`, com os mesmos IDs.

| Estado | Nº | Cenários |
|---|---|---|
| **Igual** | 21 | C01–C04, C06, H01–H04, H06–H08, H11, H12, X02, X03, X05, X06, E03, E05, U02 |
| **Equivalente** (outra API ou nome de evento) | 16 | C08 (`effect()`), C09, C10, H05, H09, H10 (`start(..., { history / clearHistory })`), X01 (`goto`), X04 (`flow:exit`), X07 (`goto(flow)` sem passo), X09 (overlays), E01, E02, E04, E06, E07, U03 (scroll quando o ecrã está montado) |
| **Diverge** (intencional) | 4 | C05: a v3 emite `action:unhandled`. C07: a v3 emite `back:empty`. Em ambos, a navegação é igual e só se acrescenta um evento. X08: o overlay funciona sem configuração extra (na v2, um anotherObject sem `name` era ignorado, o que é um bug). U01: `pushState` em vez de só `replaceState`, por isso o back do browser passa a navegar o flow |

Notas:
- **H05:** na v2, o passo atual pode aparecer no próprio histórico depois de um ciclo (`['a']` estando em `a`). Na v3 o histórico fica `[]`. A navegação observável é a mesma (o back não navega).
- **H06:** a v3 tem a mesma regra que a v2: cada passo que reaparece no histórico precisa de `allowCyclicHistory`. Uma primeira versão deste spike assumia uma divergência que não existe, e o teste de paridade apanhou-a.
- **X07 e X08/X09** foram decididos: a retoma de flows e os modais (como overlays) mantêm-se na v3.

## Fora do âmbito do spike

- View Transitions e `checkpoint`.
- Firefox e WebKit no e2e: os builds em cache são de versões antigas do Playwright e testá-los exige descarregar novos (`npx playwright-core install firefox webkit`, cerca de 200 MB).
- SSR completo (hidratação do estado do flow).
- Os tempos do `completions.mjs` são a frio (inclui reanalisar o ficheiro de sonda). No editor, as respostas incrementais são mais rápidas.

## Próximos passos

1. Decidir se o spike passa a protótipo da lib (pacote `packages/` ou `src/v3`) e com que estrutura de build (ESM + tipos).
2. Firefox e WebKit no e2e, e e2e em CI.
3. CLI `react-flow-app check`: `validateFlows` + Mermaid + diff do grafo face à branch base.
4. Guards/middleware (bloquear ou redirecionar uma navegação) e o evento `navigation:blocked`, se forem precisos além do redirecionar num listener.
