<!-- cspell:disable -->

# Testes gerados: cobertura de todas as transições

> **Estado:** proposto, por implementar. **Alvo:** alphas antes da beta. **Pacote:** `react-flow-app/testing` (e uma opção no engine).

## Resumo

Hoje, `getPaths(app, from)` gera **um caminho por passo alcançável** (o mais curto). Na loja de exemplo isso cobre **5 das 10
transições (50%)**. Este RFC propõe gerar **um caminho por transição**, incluindo back, overlays, saídas de flow e parâmetros de URL,
e um runner que transforma isso em testes com uma linha. As transições que não der para gerar ficam listadas, com a razão.

O objetivo é que uma app com a v3 tenha, sem escrever testes à mão, a garantia de que **o mapa da navegação funciona como declarado**
em todas as transições. Os testes de UI (o botão faz o `dispatch` certo?) continuam fora deste âmbito, mas a fase 3 dá-lhes uma ferramenta.

## Situação atual

| Ferramenta                         | O que garante                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `getPaths(app, from)`              | Cada passo alcançável é atingido pelo caminho mais curto; os `branch` decidem bem para os `samples` |
| `engine.coverage()`                | Lista as transições que nenhum teste percorreu                                                    |
| `validateFlows(app)`               | Erros estáticos: ações sem transição, destinos inexistentes, passos inalcançáveis, etc.           |
| `react-flow-app check`             | Snapshot do grafo no repo e diff em cada PR                                                       |

### Limites (o que este RFC resolve)

1. **Um caminho por passo, não por transição.** Transições fora dos caminhos mais curtos (na loja: `cancel`, `retry`, `finish` e as
   duas saídas do login) não são testadas.
2. **Só para a frente.** O back e o efeito real de `ignoreHistory`, `clearHistory` e `allowCyclicHistory` na app não são testados.
3. **Overlays nunca são percorridos.** Nenhuma transição entra num overlay (abrem-se pela UI), por isso as suas transições ficam de fora.
4. **Um exemplo por ramo.** Não há forma de dar vários payloads para o mesmo destino.
5. **Os `effect` correm de verdade.** Chamadas reais (analytics, `window.open`) acontecem nos testes, a menos que se faça mock.
6. **Um só ponto de partida.** Os entrypoints (deep links) precisam de uma chamada ao `getPaths` cada.
7. **Parâmetros de URL ausentes.** Os caminhos não passam `params`, por isso o URL de passos como `pay/:orderId` não é verificado.
8. **A UI não é testada.** Se o botão faz o `dispatch` certo, o payload, o render, o lazy loading e o URL no browser.

### Fora do âmbito

- Testar a lógica dos resolvers além dos exemplos dados (exploração de payloads, property-based testing).
- Resolvers que dependem de estado externo (feature flags, API): continuam a precisar de testes à mão.
- Testes e2e no browser.

## Fase 1: um caminho por transição

### `getTransitionPaths(app, options?)`

Para cada transição do grafo: o caminho mais curto desde um ponto de partida até à origem da transição, mais a própria transição, e o
resultado esperado.

```ts
type TransitionPath = {
	transition: string; // chave de cobertura: 'checkout.payment:pay->failure'
	root: string; // ponto de partida: 'home.dashboard'
	steps: Array<{ action: string; payload?: unknown; params?: FlowParams; from?: string }>;
	expect: { flow: string; step: string } | { stays: true } | { exit: true };
};

type TransitionPaths = {
	paths: TransitionPath[];
	skipped: Array<{ transition: string; reason: 'no-sample' | 'unreachable' | 'exit-without-caller' }>;
};
```

Casos que exigem mais do que um BFS simples:

| Transição                | Regra                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `goto.exit()`            | O caminho tem de passar pela transição que abriu o flow, porque é para lá que a saída volta. Pesquisa com restrição: raiz → transição `goto` de entrada → origem da saída. Há uma variante por cada quem abre o flow. |
| `goto(flow)` (retomar)   | O destino esperado é o último passo desse flow dentro do próprio caminho, ou o inicial se o flow não foi visitado.          |
| `effect`                 | Espera-se que o passo não mude e que o evento `action` seja emitido.                                                      |
| `branch`                 | Um caminho por destino, com o payload do `sample` desse destino. Sem `sample`, vai para `skipped` com `no-sample`.         |
| Overlay                  | O caminho vai até um passo do flow do overlay e faz `dispatch` com `from: <ecrã do overlay>`, a via que o `useFlow(overlayScreen)` usa. |

### Opções

```ts
getTransitionPaths(flowApp, {
	// Por omissão: o passo inicial do primeiro flow e todos os `entrypoint` (um deep link é um ponto de partida real).
	roots: ['home.dashboard', 'auth.login'],
	// Parâmetros de URL por passo, tipados pelo Register (StepParams). Ficam nos testes, não na definição do flow.
	params: { 'checkout.payment': { orderId: '42' } },
});
```

Com `params`, cada caminho passa-os no `dispatch` que entra no passo, e o runner verifica que `engine.urlOf(...)` não tem parâmetros
por preencher (`:orderId`).

### Engine: `effects: false`

```ts
createFlowEngine(app, { initial, effects: false });
```

A ação de um `effect` continua a emitir o evento `action` e a contar para a cobertura, mas o `run` não é executado. É só para testes, e
fica documentado como tal.

### Critérios de aceitação

- Loja de exemplo: **10/10 transições** geradas e a passar.
- Exemplo dos overlays (Storybook) a 100%.
- Um teste por regra da tabela acima que falhe se a geração estiver errada (incluindo um flow aberto por dois chamadores diferentes,
  para o `goto.exit()`).
- `skipped` correto para um `branch` sem `samples` e para um passo inalcançável.
- O `getPaths` atual mantém-se, por compatibilidade com as alphas já publicadas.

## Fase 2: back, vários exemplos e o runner

### Back como snapshot (e invariantes)

Para cada caminho, depois de chegar ao destino, o gerador faz `back()` até ao fim e regista o percurso:

```
checkout.payment:pay->failure   back: checkout.failure → checkout.payment → checkout.cart → home.dashboard → (back:empty)
```

O percurso vai para um snapshot. **Não** se calcula o histórico esperado nos testes, porque isso duplicaria as regras do engine: os
testes passariam a testar o engine contra uma cópia de si próprio. Com o snapshot, quem revê o PR vê quando o comportamento do back
muda.

Juntam-se três invariantes, que não dependem do engine:

1. O back nunca para num passo com `ignoreHistory`.
2. Depois de entrar num passo com `clearHistory`, o back seguinte é `back:empty`.
3. O back no primeiro passo de um flow aberto por `goto` volta ao passo que o abriu.

### Vários exemplos por destino

```ts
pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure'), {
	samples: { success: { ok: true }, failure: [{ ok: false, reason: 'card' }, { ok: false, reason: 'funds' }] },
}),
```

Cada exemplo gera o seu caminho. O tipo passa a aceitar `P | readonly P[]`. **Condição:** o benchmark de 1000 ecrãs não pode subir mais
de 5% nas instanciações.

### `describeFlows(app, options)`

Um runner independente da framework, que recebe o `describe`, o `it` e, opcionalmente, o `expect` do Vitest ou do Jest. A lib não passa a
depender de nenhuma framework de testes.

```ts
import { describe, expect, it } from 'vitest';
import { describeFlows } from 'react-flow-app/testing';
import { flowApp } from '../src/app.flow';

describeFlows(flowApp, { describe, it, expect, params: { 'checkout.payment': { orderId: '42' } } });
```

Gera:

- um `describe` por flow;
- um `it` por transição, com nome legível: `checkout.payment —pay→ failure ({ ok: false })`;
- os snapshots do back (se receber `expect`) e as três invariantes;
- um `it('covers every transition')` no fim, que falha quando aparece uma transição nova sem caminho gerado e sem estar na lista de
  exceções (`allowUncovered: ['checkout.x:y->z']`);
- os `skipped` como `it.skip`, com a razão no nome, para ficarem visíveis no relatório.

### Critérios de aceitação

- A loja usa `describeFlows` numa linha e tem 10/10, snapshots do back e invariantes a passar.
- Exemplos com Vitest e com Jest na documentação (e um teste da própria lib com cada um).
- Mudar uma opção de histórico na loja altera o snapshot do back.

## Fase 3: UI e CI

### Harness para testes de componentes

```tsx
const harness = createScreenHarness(flowApp, { flow: 'checkout', step: 'payment', params: { orderId: '42' } });
render(harness.element); // React Testing Library ou outra
await user.click(screen.getByRole('button', { name: 'Pay' }));
expect(harness.dispatched).toEqual([{ action: 'pay', payload: { ok: true } }]);
```

Renderiza só esse ecrã, num Provider com um engine parado nesse passo, e regista os `dispatch` sem navegar. Fecha o limite 8 (o botão
faz o `dispatch` certo) sem acrescentar dependências à lib.

### `react-flow-app check --coverage`

O resumo do PR passa a listar as transições que os testes gerados não cobrem e porquê (sem `sample`, inalcançável, exceção declarada).
Assim, quem revê sabe o que falta testar à mão.

### Documentação

A página de testes do site é reescrita: o que os testes gerados garantem, os limites que sobram, e uma receita por caso (testes gerados,
back, componentes, e2e).

## Decisões

| Decisão                       | Escolha                                      | Alternativa rejeitada                                   | Porquê                                                    |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| Onde ficam os parâmetros      | Opções do gerador (`params`)                 | Campo `sampleParams` no passo                           | Dados de teste não entram no código de produção           |
| Como testar o back            | Snapshot do percurso e invariantes           | Calcular o histórico esperado                           | Não duplicar o engine                                     |
| Integração com o runner       | `describeFlows` recebe `describe`/`it`/`expect` | Um subpath por framework (`/vitest`, `/jest`)         | Zero dependências, funciona com qualquer runner           |
| Effects nos testes            | `effects: false` no engine                   | Mocks em cada teste                                     | Um sítio só, e a cobertura continua a contar              |

## Plano de entrega

| Fase | Entrega                                                                                     | Versão alvo |
| ---- | ------------------------------------------------------------------------------------------- | ----------- |
| 1    | `getTransitionPaths`, pontos de partida, `params`, `effects: false`, `skipped`              | alpha.2     |
| 2    | Back (snapshot e invariantes), vários `samples`, `describeFlows`                            | alpha.3     |
| 3    | `createScreenHarness`, `check --coverage`, página de testes reescrita                       | alpha.4     |

Cada fase é um PR para a `v3`, com changeset, testes, uma story no Storybook e a demo atualizada: o separador "Generated tests" passa de
5/10 para 10/10.

## Riscos

- **Explosão de caminhos** em apps grandes (transições × exemplos × pontos de partida): o runner deve agrupar por flow, e o gerador pode
  usar só o primeiro ponto de partida que alcança cada transição. Medir com o gerador do benchmark (1000 ecrãs).
- **Saídas de flow com muitos chamadores:** uma variante por chamador pode multiplicar casos. Limite configurável, com o resto em `skipped`.
- **Snapshots do back demasiado sensíveis:** mudanças legítimas obrigam a atualizar snapshots. É o comportamento pretendido, mas a
  documentação deve explicá-lo.
