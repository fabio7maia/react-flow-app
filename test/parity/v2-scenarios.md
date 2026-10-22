<!-- cspell:disable -->

# Testes de caracterização da v2

Estes testes fixam o comportamento **atual** da v2 (2.18): o que a lib faz hoje, incluindo particularidades. Não descrevem o comportamento ideal. São o contrato de compatibilidade para a v3: cada cenário tem um ID (C, H, X, E, U), e a v3 deve reproduzi-lo ou documentar a divergência.

Correm com a API pública real (`FlowManager`, `FlowProvider`, `useFlow`, `useFlowManager`), ecrãs React reais carregados por `React.lazy` e listeners reais. Não há mocks do motor.

```bash
CI=true node scripts/test.js --watchAll=false src/__tests__/characterization
```

## Catálogo

| ID      | Cenário                                                                                |
| ------- | -------------------------------------------------------------------------------------- |
| **C01** | Sem `initialStep`, começa no primeiro passo declarado                                  |
| **C02** | `initialStep` na definição do passo é respeitado                                       |
| **C03** | `initialStepName` do Provider sobrepõe-se ao `initialStep`                             |
| **C04** | Dispatch com destino em string navega e guarda o passo anterior no histórico           |
| **C05** | Dispatch de uma ação sem transição não faz nada (nem emite eventos)                    |
| **C06** | `back` volta ao passo anterior e retira-o do histórico                                 |
| **C07** | `back` no primeiro passo (sem flow de origem) não faz nada                             |
| **C08** | Destino em função sem retorno: executa o efeito e fica no mesmo passo                  |
| **C09** | Destino em função que devolve `navigateTo` de um passo do mesmo flow                   |
| **C10** | `getCurrentStep`, `hasPreviousStep` e `getLastAction` refletem a navegação             |
| **H01** | `ignoreHistory`: ao sair do passo, ele não fica no histórico                           |
| **H02** | `back` a partir de um passo `ignoreHistory` volta ao passo anterior                    |
| **H03** | `clearHistory`: ao chegar ao passo, o histórico é limpo e o `back` não faz nada        |
| **H04** | `clearHistory`: o passo seguinte só tem o passo `clearHistory` no histórico            |
| **H05** | Sem `allowCyclicHistory`, voltar a um passo já visitado corta o histórico              |
| **H06** | `allowCyclicHistory` só no destino não chega (ver particularidade 1)                   |
| **H07** | Com `allowCyclicHistory` em todos os passos do ciclo, o histórico cresce               |
| **H08** | Dispatch com a opção `ignoreHistory` não guarda o passo atual                          |
| **H09** | `navigateTo(..., { history })` substitui o histórico                                   |
| **H10** | `navigateTo(..., { clearHistory: true })` limpa o histórico                            |
| **H11** | `initialHistory` do Provider permite `back` a partir do primeiro ecrã                  |
| **H12** | `clearHistory()` do `useFlow` limpa o histórico do flow atual                          |
| **X01** | Função que devolve `navigateTo` de outro flow muda de flow                             |
| **X02** | `back` no primeiro passo do outro flow volta ao passo de origem                        |
| **X03** | `back` dentro do outro flow usa primeiro o histórico desse flow                        |
| **X04** | `back` no primeiro passo do outro flow emite `backExit` nos listeners desse flow       |
| **X05** | `useFlowManager().start` muda de flow e o `back` volta ao flow anterior                |
| **X06** | `start` com `clearHistory` esquece o flow de origem                                    |
| **X07** | Voltar a um flow já visitado retoma o passo onde estava                                |
| **X08** | `anotherObjects` sem `name`: o dispatch é ignorado (ver particularidade 2)             |
| **X09** | `anotherObjects` com `name`: o dispatch usa as transições do objeto                    |
| **E01** | Arranque emite `mount` do passo inicial                                                |
| **E02** | Dispatch emite `dispatch` (no passo de origem, com a ação) e depois `mount` do destino |
| **E03** | O payload do dispatch chega aos listeners                                              |
| **E04** | `back` emite `back` (já no passo de destino) e depois `mount`                          |
| **E05** | O `url` do evento é `/baseUrl/url-do-passo` (ou o nome do passo)                       |
| **E06** | A prop `listen` do Provider recebe os eventos de todos os flows                        |
| **E07** | `onFlowMount` / `onFlowUnmount` são chamados ao mudar de flow                          |
| **U01** | `withUrl` escreve `#/baseUrl/passo` com `replaceState` (sem novas entradas no browser) |
| **U02** | `withUrl: false` não toca no URL                                                       |
| **U03** | `scrollRestoration`: o `back` repõe a posição de scroll (~300 ms depois, `smooth`)     |

## Particularidades encontradas

Comportamentos que os testes fixam, mas que provavelmente não são intencionais ou não estão documentados. A v3 tem de decidir explicitamente se os mantém.

1. **`allowCyclicHistory` tem de estar em todos os passos do ciclo** (H06, H07). Ao sair de um passo sem a opção, o histórico é cortado na primeira ocorrência desse passo, mesmo que o destino a tenha.
2. **`anotherObjects` só funcionam se o objeto tiver `name`** (X08, X09). O `Flow.dispatch` procura `screen.name`, que os objetos normalmente não têm. O exemplo no Storybook (`modalExample`) não tem `name`, por isso o dispatch do modal nunca navega.
3. **Os tipos exigem que `step(...)` mapeie todas as ações do ecrã** (`Record`, não `Partial`). Esquecer uma ação dá erro de compilação. É uma garantia que a v3 (transições em statement separado) passa para o `validateFlows`.
4. **A ordem dos eventos de um dispatch é `dispatch` → `mount`**, com o `dispatch` no passo de origem e o `mount` emitido durante o render (E02). No `back`, o evento `back` já vem com o passo de destino (E04).
5. **Voltar a um flow por `navigateTo()` sem passo retoma o passo onde o flow estava** (X07): cada flow guarda o seu passo atual entre visitas.
6. **O botão back do browser não navega o flow** (U01): o URL é escrito com `replaceState` e não há listener de `popstate`.
7. **A scroll restoration usa um `setTimeout` de 300 ms** (U03), independente do tempo real de carregamento do ecrã.
