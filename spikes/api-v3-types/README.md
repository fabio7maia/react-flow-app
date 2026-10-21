# Spike — tipos da API v3 (abordagem A, ecrãs e flows em ficheiros separados)

> Protótipo descartável para validar o [RFC da abordagem A](../../rfcs/api-v3/01-grafo-declarativo.md). Não é código de produção, nem faz parte do build da lib.

## Objetivo

Confirmar, com código a compilar e a correr, que a abordagem A cumpre as prioridades com **um ficheiro por ecrã, um ficheiro por flow e a composição num terceiro ficheiro**:

1. tipagem ponta a ponta com intellisense, sem genéricos escritos à mão;
2. `goto` entre flows declarados em ficheiros diferentes, validado em compilação;
3. eventos tipados para integrações de terceiros;
4. grafo, diagrama, validação e testes gerados sem executar código;
5. tempo de type-check aceitável numa app grande (50 flows / 300 ecrãs).

## Como correr

Usa as dependências da raiz do repo (TypeScript 5.8, React 19). A partir desta pasta:

```bash
../../node_modules/.bin/tsc -p tsconfig.json --noEmit   # tipos + testes de tipos
node scripts/test.mjs                                    # testes de runtime (node:test)
node scripts/completions.mjs                             # intellisense real (language service)
node scripts/bench.mjs 50 6                              # benchmark: 50 flows × 6 passos
```

## Estrutura

```
lib/                        protótipo da lib ('react-flow-app' via tsconfig paths)
  types.ts                  ecrãs, ações, payloads, transições
  screen.ts                 defineScreen, payload
  flow.ts                   defineFlow, goto, branch, Register
  app.ts                    createFlowApp, contrato de eventos
  engine.ts                 motor headless (start, dispatch, back, eventos, cobertura)
  graph.ts                  toGraph, toMermaid, validateFlows, getPaths
  react.tsx                 FlowProvider, useFlow, useFlowSelector, useFlowEvents
example/
  screens/<ecrã>/<ecrã>.screen.ts   definição (ações, payloads, meta, loader)
  screens/<ecrã>/<Ecrã>.tsx         componente (lazy)
  flows/<flow>.flow.ts              passos + transições
  app.flow.ts                       composição + Register
  App.tsx                           Provider + analytics
tests/
  types.test-d.ts           28 asserções de tipos (20 erros esperados + 8 igualdades de tipo)
  engine.test.ts            24 testes de runtime
  parity.test.ts            41 cenários de paridade com a v2 (mesmos IDs da caracterização)
scripts/                    test, completions, bench
```

## Resultados

| Hipótese | Resultado |
|---|---|
| Ecrã num ficheiro, flow noutro, composição num terceiro | ✅ Funciona, com uma condição (ver descoberta 1) |
| `dispatch` tipado a partir do ecrã (ações, payload obrigatório/opcional) | ✅ |
| Transições: só passos do flow, só ações do ecrã do passo | ✅ Erros claros, incluindo `Did you mean '"payment"'?` |
| `goto('flow', 'passo')` entre ficheiros, validado pelo `Register` | ✅ Sem imports circulares (ver descoberta 1) |
| Payload inferido dentro do `branch` | ✅ `(_, p) => p.ok` sem anotações |
| `branch` só pode devolver um dos alvos declarados | ✅ |
| Metadados tipados pela app (`Register['meta']`) | ✅ |
| Eventos tipados (`e.action === 'pay'` → `e.payload.ok`) | ✅ (ver descoberta 3) |
| Intellisense real em 9 pontos da API | ✅ 9/9 sugestões exatamente as esperadas |
| Grafo e Mermaid sem executar resolvers | ✅ |
| `validateFlows` (ações sem transição, inalcançáveis, sem inicial) | ✅ |
| Testes gerados por caminho + relatório de cobertura de transições | ✅ (ver descoberta 4) |
| Semântica de histórico (ignoreHistory, clearHistory, ciclos, exit, back entre flows) | ✅ 7 testes |
| Engine por instância (sem singleton) | ✅ |
| Type-check com 300 ecrãs | ✅ 1,3–1,7 s (depois da descoberta 3) |
| Paridade com a v2 (41 cenários de caracterização) | ✅ 34 iguais ou equivalentes, 3 divergências intencionais, 4 fora do âmbito (ver abaixo) |
| Overlays (v2: anotherObjects) e retoma de flows (v2: `navigateTo()` sem passo) | ✅ |

### Benchmark de type-check

Gerado por `scripts/bench.mjs`: um ficheiro por ecrã, por componente e por flow. Cada ecrã tem uma ação com nome único, um `branch` e um `goto` para outro flow, e o componente usa `useFlow`.

| Ecrãs | Ficheiros | Check time | Memória | Instanciações |
|---|---|---|---|---|
| 60 | 132 | 0,46 s | 107 MB | 63k |
| 300 | 652 | 1,3–1,7 s | 158 MB | 648k |
| 600 | 1302 | 2,5–2,8 s | 222 MB | 2,18M |

Os intervalos vêm de várias execuções na mesma máquina. O tempo cresce de forma aproximadamente linear. As instanciações crescem mais depressa (provavelmente por causa do `Extract` por ação em `ActionPayloads`); é um ponto a otimizar, mas não bloqueia.

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

**Custo:** o TS deixa de poder verificar se todos os passos têm transições. Isso passa para o `validateFlows` (`unhandled-action`).

### 2. O `loader` não pode exigir `ComponentType`

Com `loader: () => Promise<{ default: ComponentType }>`, o TS tem de inferir o tipo de retorno do componente para validar o loader. Como o componente usa `useFlow(paymentScreen)`, o tipo do `paymentScreen` passa a depender de si próprio (`TS7022`/`TS7023`). Só aparece em componentes cujo JSX depende do resultado do hook (ex.: `{canGoBack && ...}`). Por isso é traiçoeiro: funciona até deixar de funcionar.

**Solução:** `default: unknown` no tipo, mais uma verificação em runtime no `lazy`. A alternativa de obrigar o dev a anotar o retorno dos componentes foi rejeitada, por ser fricção constante.

### 3. A union de eventos não pode ser um produto cartesiano

A primeira versão gerava um membro por flow × passo × tipo de evento × ação. Com 300 ecrãs, **o check passou de 1,5 s para 8,6 s, e com 600 ecrãs para 35 s** (crescimento quadrático). Isolado por ablação: só o ficheiro que usa `on('action', e => ...)` era responsável.

**Solução:** um membro por tipo de evento e um membro por **nome de ação**, com o payload correlacionado com a ação. `flow` e `step` passam a ser unions simples.

**Custo:** `if (e.flow === 'checkout')` já não estreita `e.step` para os passos do checkout. Para analytics, o que importa (ação → payload) mantém-se.

### 4. Testes gerados precisam de payloads de exemplo nos `branch`

O grafo mostra as duas arestas de `pay` (`success` e `failure`), mas para percorrer um caminho é preciso um payload que leve o resolver a escolher cada uma. No spike, isso é um mapa `aresta → payload` no teste. Na lib, deve ser uma opção do `branch` (ex.: `branch(targets, resolve, { samples: { success: { ok: true }, failure: { ok: false } } })`), validada pelo `validateFlows`.

## Paridade com a v2

Os 41 cenários dos testes de caracterização da v2 (`src/__tests__/characterization`, branch `test/v2-characterization`) foram reescritos com a API v3 em `tests/parity.test.ts`, com os mesmos IDs.

| Estado | Nº | Cenários |
|---|---|---|
| **Igual** | 19 | C01–C04, C06, H01–H04, H06–H08, H11, H12, X02, X03, X05, X06, E03 |
| **Equivalente** (outra API ou nome de evento) | 15 | C08 (`effect()`), C09, C10, H05, H09, H10 (`start(..., { history / clearHistory })`), X01 (`goto`), X04 (`flow:exit`), X07 (`goto(flow)` sem passo), X09 (overlays), E01, E02, E04, E06, E07 |
| **Diverge** (intencional) | 3 | C05: a v3 emite `action:unhandled`. C07: a v3 emite `back:empty`. Em ambos, a navegação é igual e só se acrescenta um evento. X08: o overlay funciona sem configuração extra (na v2, um anotherObject sem `name` era ignorado, o que é um bug) |
| **Fora do âmbito** | 4 | E05, U01–U03 (URL e scroll) |

Lacunas fechadas no engine por causa da paridade:
- `effect()` para ações só com efeito (C08);
- opções `ignoreHistory` no `dispatch` e `clearHistory`/`history` no `start` e no arranque (H08–H11, X06);
- `clearHistory()` imperativo (H12);
- `flow:exit` emitido sempre que o flow ativo muda, com `reason: 'goto' | 'back' | 'exit' | 'start'` (X04, E07);
- retoma de flows: `goto(flow)` e `start(flow)` sem passo voltam ao último passo desse flow (X07);
- overlays: `defineFlow({ overlays: { help } })`, com transições no mesmo `transitions()`. O dispatch identifica a origem pelo nome do ecrã (`useFlow(helpScreen)`), e o overlay tem nó próprio no grafo (`{{@help}}` no Mermaid) e entra no `validateFlows` (X08, X09).

Notas:
- **H05:** na v2, o passo atual pode aparecer no próprio histórico depois de um ciclo (`['a']` estando em `a`). Na v3 o histórico fica `[]`. A navegação observável é a mesma (o back não navega).
- **H06:** confirmado que a v3 tem a mesma regra que a v2: cada passo que reaparece no histórico precisa de `allowCyclicHistory`. Uma primeira versão deste spike assumia uma divergência que não existe, e o teste de paridade apanhou-a.
- **X07 e X08/X09** foram decididos: a retoma de flows e os modais (como overlays) mantêm-se na v3.

## Fora do âmbito do spike

- Sincronização com o URL, View Transitions, scroll restoration e `checkpoint`.
- Render React em runtime: a camada React está só verificada em tipos.
- Os tempos do `completions.mjs` são a frio (inclui reanalisar o ficheiro de sonda). No editor, as respostas incrementais são mais rápidas.

## Próximos passos

1. Incorporar as descobertas 1–4 no RFC A (feito no mesmo commit deste spike).
2. ~~Testes de caracterização da v2 e paridade~~ (feito: ver acima).
3. ~~Overlays e retoma de flows~~ (feito).
4. URL e scroll restoration, para fechar os cenários pendentes E05 e U01–U03.
5. Otimizar `ActionPayloads` (instanciações) e repetir o benchmark com 1000 ecrãs.
6. Decidir a API de `samples` no `branch` e o formato final dos eventos (contrato público).
