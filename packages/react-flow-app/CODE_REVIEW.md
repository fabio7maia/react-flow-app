# Code Review - react-flow-app

## 1. Visao Geral do Projeto

**react-flow-app** e uma biblioteca React para navegacao baseada em eventos e fluxos multi-step (wizards, onboarding, formularios multi-passo). A arquitetura e orientada a eventos onde acoes do utilizador disparam transicoes entre steps dentro de flows.

### Arquitetura

```
FlowManager (singleton, orquestra multiplos flows)
  └── Flow (representa um fluxo com steps)
       └── Step (ecrã individual com acoes)

FlowProvider (contexto React, bridge entre modelos e UI)
  ├── useFlow (hook para screens - dispatch, back, etc.)
  └── useFlowManager (hook para controlo global - start, clearHistory)
```

---

## 2. Revisao por Modulo

### 2.1 Models

#### `Step` (`src/models/step/step.model.ts`)
- **Avaliacao**: Simples e correto. Classe de dados (data class) para representar um step.
- **Problemas**: Nenhum critico. Poderia ser um interface/type simples em vez de classe.

#### `Flow` (`src/models/flow/flow.model.tsx`)
- **Avaliacao**: Componente core com ~500 linhas. Contem a logica principal de navegacao.
- **Problemas identificados**:
  1. **Linhas 44, 46**: `as any` desnecessarios - `this.steps = {} as any` pode ser `this.steps = {}` com tipagem correta
  2. **Linha 26**: Cache global mutavel (`_cachedSteps`) fora da classe - pode causar memory leaks em SPA e problemas com SSR
  3. **Linha 113**: `this.fromFlow ? true : false` - simplificavel para `!!this.fromFlow`
  4. **Linha 160**: `options.initialStep` acede `options` sem null-check (pode dar erro se `options` for undefined)
  5. **Linha 204**: `render()` tem side-effects (chama `this.mount()`) - anti-pattern React pois render deveria ser puro
  6. **Linha 289**: `hasOwnProperty` direto no objeto - vulneravel a prototype pollution, usar `Object.hasOwn()`
  7. **Linha 383-384**: `this.history = this.history.splice(...)` - `splice` modifica in-place E retorna removed items. Isto esta a apagar historia incorretamente. Deveria usar `slice` em vez de `splice`.
  8. **Linha 464-465**: Self-assignment `this.currentStepName = this.currentStepName` - code smell, intencional para trigger o setter mas pouco legivel
  9. **Complexidade ciclomatica alta**: Metodos `dispatch`, `treatHistory`, `start` tem muita complexidade (ja sinalizados pelo sonarjs)

#### `FlowManager` (`src/models/flowManager/flowManager.model.ts`)
- **Avaliacao**: API builder pattern bem desenhada com tipagem generica.
- **Problemas identificados**:
  1. **Linha 21**: `_instance` sem tipagem - singleton pattern manual, nao e thread-safe e pode causar problemas com HMR
  2. **Linha 29**: `this.flows = {} as any` - tipagem forçada
  3. **Linha 38**: `hasOwnProperty` direto - mesma vulnerabilidade
  4. **Linha 101, 110**: `(screenActions as any)[action]` e `(actions as any)[action]` - type assertions que perdem type-safety
  5. **Linha 171**: Funcao duplicada (`sonarjs/no-identical-functions`) sinalizada pelo linter mas ignorada

### 2.2 Providers

#### `FlowProvider` (`src/providers/flow/flow.provider.tsx`)
- **Avaliacao**: Provider principal com ~270 linhas. Boa separacao de concerns.
- **Problemas identificados**:
  1. **Linha 65**: `const [_, setForceUpdate]` - useState com counter para force update e um anti-pattern. React 18+ tem `useSyncExternalStore` para isto
  2. **Linha 76**: `React.useRef<string>(undefined)` - `useRef(undefined)` nao e consistente com o tipo declarado
  3. **Linha 80-87**: `document.startViewTransition` - Sem feature detection completa, assume browser environment (problemas com SSR)
  4. **Linha 98**: `window.history.replaceState(null, null, ...)` - segundo argumento e string deprecated (deveria ser `''`)
  5. **Linha 223-226**: Inicializacao fora de `useEffect` - side effect no corpo do componente (anti-pattern React strict mode)
  6. **Linha 256**: `_` no array de dependencias do useEffect - o estado numerico force update nao deveria ser dependencia semantica
  7. **Linha 128**: `initialHistory` passado sempre para `start` - nao deveria ser apenas na primeira chamada?

### 2.3 Hooks

#### `useFlow` (`src/hooks/useFlow/useFlow.hook.tsx`)
- **Avaliacao**: Hook principal de consumo. Interface limpa.
- **Problemas identificados**:
  1. **Linha 21-31**: `useCallback` com funcoes condicionais (`flow?.getCurrentStep || fallback`) - viola regras de hooks se flow mudar entre renders
  2. **Linha 6-8**: `emptyFn` com generic desnecessariamente complexo

#### `useFlowManager` (`src/hooks/useFlow/useFlow.hook.tsx`)
- **Avaliacao**: Simples e correto.
- **Problemas**: `fm.clearAllHistory` acedido diretamente sem null-check em `fm`

#### `useLogger` (`src/hooks/useLogger/useLogger.tsx`)
- **Avaliacao**: Funcional mas com bug.
- **Bug**: **Linha 18** - `warn: LoggerHelper.error(group)` deveria ser `LoggerHelper.warn(group)` - warn esta a chamar error!
- **Anti-pattern**: `useCallback(() => ({...}), [group])()` - criar e invocar callback imediatamente e desnecessario, `useMemo` seria mais adequado

### 2.4 Components

#### `Placeholder` (`src/components/placeholder/placeholder.component.tsx`)
- **Problema**: Logger chamado no corpo do componente (fora de useEffect) - executa em cada render

#### `ErrorBoundary` (`src/components/errorBoundary/errorBoundary.tsx`)
- **Avaliacao**: Correto mas poderia beneficiar das novas APIs React 19 (error boundaries funcionais)
- **Problema**: `this.setState({...this.state, ...})` - spread de state no setState e anti-pattern (setState ja faz merge parcial em classes)

#### `StepRender` (`src/components/stepRender/stepRender.tsx`)
- **Avaliacao**: Simples e correto. Poderia usar o hook `useFlowManager` em vez de aceder ao context diretamente.

#### `UnexpectedError` (`src/components/unexpectedError/unexpectedError.tsx`)
- **Problema**: Mensagem hardcoded em portugues - sem i18n
- **Problema**: `useEffect` sem dependencias completas (`logger` e `error` em falta no array)

### 2.5 Helpers

#### `CoreHelper` (`src/helpers/core/core.helper.ts`)
- **Avaliacao**: Utilitarios simples. `getValueOrDefault` replica o operador `??` do JS moderno.
- **Sugestao**: Substituir por nullish coalescing (`??`) nativo

#### `LoggerHelper` (`src/helpers/logger/logger.helper.ts`)
- **Avaliacao**: Sistema de logging configuravel por grupo. Util para debug.
- **Problema**: Estado global mutavel (`_groups`) - pode causar problemas em testes e SSR

### 2.6 Types (`src/types/flow/flow.type.tsx`)
- **Avaliacao**: Tipagem boa mas com areas de melhoria.
- **Problemas**:
  1. `TScreen.actions: any` - comentario indica que e necessario para inferencia, mas perde toda a type-safety
  2. Muitos `Record<string, any>` - payloads sem tipagem forte
  3. Extensao `.tsx` para ficheiro apenas de tipos - deveria ser `.ts`
  4. `TFlowManagerContext.fm: FlowManager<any, any, any, any>` - 4x any perde toda a genericidade

### 2.7 Configuracao

- **ESLint 6.x**: Versao muito antiga (atual e 9.x). Muitas regras desativadas com eslint-disable
- **Jest 26.x**: Versao antiga (atual e 29.x). Coverage threshold a 0% - sem cobertura minima
- **TypeScript 5.8**: Atualizado e bom
- **Storybook 8.6**: Atualizado e bom
- **Prettier 1.x**: Muito desatualizado (atual e 3.x)

---

## 3. Bugs Identificados

| #  | Severidade | Local | Descricao |
|----|-----------|-------|-----------|
| 1  | **Alta** | `useLogger.tsx:18` | `warn` chama `LoggerHelper.error` em vez de `LoggerHelper.warn` |
| 2  | **Alta** | `flow.model.tsx:383-384` | `splice` usado onde deveria ser `slice` - corrompe historico |
| 3  | **Media** | `flow.model.tsx:160` | Acesso a `options.initialStep` sem null-check em `options` |
| 4  | **Media** | `flow.provider.tsx:223-226` | Side effect fora de useEffect (incompativel com StrictMode) |
| 5  | **Baixa** | `flow.model.tsx:204-218` | Side effects em `render()` (chama mount listeners) |
| 6  | **Baixa** | `placeholder.component.tsx:12` | Logger executado em cada render sem useEffect |

---

## 4. Metricas de Qualidade

| Metrica | Valor | Avaliacao |
|---------|-------|-----------|
| Cobertura de testes | ~0% (apenas fake.test.tsx) | Critica - sem testes unitarios reais |
| Complexidade ciclomatica | Alta (dispatch, treatHistory) | Necessita refactoring |
| Type-safety | Media (muitos `any`) | Necessita melhoria |
| Bundle size | Pequeno (~15KB estimado) | Bom |
| Tree-shaking | Suportado (module exports) | Bom |
| Documentacao inline | Minima | Necessita melhoria |
| Acessibilidade | Nenhuma consideracao | Critica |

---

## 5. Pontos Positivos

1. **Arquitetura event-driven** bem pensada e extensivel
2. **Builder pattern** no FlowManager proporciona excelente DX na configuracao
3. **Lazy loading** nativo com React.Suspense
4. **Tipagem generica** no FlowManager permite inferencia de actions por screen
5. **View Transitions API** ja integrada
6. **Cross-flow navigation** e um diferencial forte
7. **Listener system** flexivel (mount, back, dispatch, backExit, all)
8. **History management** sofisticada (cyclic prevention, checkpoints, clear)
