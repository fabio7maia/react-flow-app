# Sugestoes de Melhoria & Preocupacoes

## Parte 1: Sugestoes de Melhoria (React 19 e Boas Praticas)

### 1.1 `use()` Hook para Lazy Loading (React 19)

React 19 introduz o hook `use()` que pode substituir `React.lazy` + `Suspense` com melhor ergonomia e suporte a streaming SSR.

**Antes (atual):**
```tsx
const Screen = React.lazy(() => import('./Screen'));
<React.Suspense fallback={<Placeholder loading />}>
  <Screen />
</React.Suspense>
```

**Depois (React 19):**
```tsx
import { use, Suspense } from 'react';

// No Flow.render(), usar use() com promise de import
const screenPromise = import('./Screen');
const Screen = use(screenPromise);
```

**Impacto**: Melhor integracao com Suspense boundaries, streaming SSR, e error handling unificado.

---

### 1.2 React Compiler (React 19) - Eliminar useCallback/useMemo Manuais

O React Compiler (anteriormente React Forget) auto-memoiza components. Isto torna obsoletos muitos `useCallback` e `useMemo` manuais no codigo.

**Ficheiros afetados:**
- `useFlow.hook.tsx` - 8x `useCallback`, 1x `useMemo`
- `useFlowManager` - 1x `useCallback`, 1x `useMemo`
- `flow.provider.tsx` - 5x `useCallback`, 1x `useMemo`

**Acao**: Configurar o React Compiler no Babel/Vite e remover memoizacao manual redundante. O compiler e mais preciso que memoizacao manual e nunca esquece dependencias.

---

### 1.3 `useActionState` para Dispatch (React 19)

React 19 introduz `useActionState` (anteriormente `useFormState`) para gerir estado de acoes assincronas com pending states automaticos.

**Antes:**
```tsx
const { dispatch } = useFlow(screens.login);
const handleSubmit = () => dispatch('submit', { email });
```

**Depois (React 19):**
```tsx
// Evolucao do useFlow para suportar actions com pending state
const { dispatch, isPending } = useFlow(screens.login);

// dispatch internamente poderia usar useActionState/useTransition
<button onClick={() => dispatch('submit', { email })} disabled={isPending}>
  {isPending ? 'A processar...' : 'Entrar'}
</button>
```

---

### 1.4 `useOptimistic` para Transicoes (React 19)

Para transicoes entre steps, `useOptimistic` pode mostrar o proximo step imediatamente enquanto o lazy loading acontece.

```tsx
const [optimisticStep, setOptimisticStep] = useOptimistic(currentStep);

const handleDispatch = (action) => {
  setOptimisticStep(nextStep); // Mostra destino imediatamente
  dispatch(action);            // Executa transicao real
};
```

---

### 1.5 Error Boundaries com `onCaughtError` (React 19)

React 19 adiciona callbacks nos error boundaries ao nivel do root:

```tsx
// No createRoot/hydrateRoot
const root = createRoot(document.getElementById('root'), {
  onCaughtError: (error) => {
    // Logging centralizado de erros capturados por ErrorBoundary
    analytics.reportError(error);
  },
  onUncaughtError: (error) => {
    analytics.reportCriticalError(error);
  },
});
```

**Impacto**: O `ErrorBoundary` class component pode ser simplificado, delegando logging ao root.

---

### 1.6 `ref` como Prop (React 19)

React 19 permite `ref` como prop regular em function components, eliminando `forwardRef`.

**Relevancia**: Se futuramente os screens precisarem expor refs (ex: para scroll, focus), nao sera necessario `forwardRef`.

---

### 1.7 Substituir Class Components por Function Components

- `ErrorBoundary` - React 19 ainda nao suporta error boundaries funcionais nativamente, mas pode usar-se `react-error-boundary` ou manter a class com getDerivedStateFromError.
- `StorybookHelper` - Converter de class estatica para funcoes puras

---

### 1.8 `useSyncExternalStore` em vez de Force Update

**Antes (atual):**
```tsx
const [_, setForceUpdate] = React.useState(0);
const forceUpdate = () => setForceUpdate(val => val + 1);
```

**Depois:**
```tsx
import { useSyncExternalStore } from 'react';

// FlowManager como external store
const snapshot = useSyncExternalStore(
  fm.subscribe,  // subscribe function
  fm.getSnapshot, // getSnapshot function
);
```

**Impacto**: Eliminacao do anti-pattern de force update, melhor integracao com concurrent features do React, e SSR compatibility.

---

### 1.9 Substituir `CoreHelper.getValueOrDefault` por Nullish Coalescing

**Antes:**
```tsx
CoreHelper.getValueOrDefault(options.initialStep, false)
CoreHelper.getValueOrDefault(currentStep.options?.ignoreHistory, false)
```

**Depois:**
```tsx
options?.initialStep ?? false
currentStep.options?.ignoreHistory ?? false
```

**Impacto**: Remocao de 100% dos usos do CoreHelper, menos codigo, melhor performance.

---

### 1.10 Tipagem End-to-End com Template Literal Types

**Antes (muitos `any`):**
```tsx
TScreen.actions: any
FlowManager<any, any, any, any>
```

**Depois:**
```tsx
type TScreen<TActions extends readonly string[]> = {
  actions: TActions;
  loader: () => React.LazyExoticComponent<React.ComponentType<any>>;
};

// Inferencia automatica de acoes por screen
type InferActions<T> = T extends { actions: infer A } ? A[number] : never;
```

---

### 1.11 Atualizar Tooling

| Ferramenta | Atual | Recomendado | Razao |
|-----------|-------|-------------|-------|
| ESLint | 6.x | 9.x (flat config) | Suporte moderno, melhor performance |
| Prettier | 1.x | 3.x | Melhor formatacao, novas features |
| Jest | 26.x | 29.x (ou Vitest) | Ja usam Vite, Vitest e natural |
| eslint-plugin-react-hooks | 1.x | 5.x | Suporte React 19 |

---

### 1.12 Testes Unitarios

Criar testes para:
- `Flow.dispatch()` - cobertura dos caminhos de acao
- `Flow.treatHistory()` - prevencao de ciclos
- `Flow.back()` - navegacao cross-flow
- `FlowProvider` - integracao com hooks
- `useFlow` / `useFlowManager` - hooks isolados

**Framework sugerida**: Vitest + React Testing Library

---

## Parte 2: Principais Preocupacoes

### P1. Ausencia Total de Testes (CRITICA)

**Severidade**: Critica

O projeto tem apenas `fake.test.tsx` (placeholder). Zero testes reais para logica complexa de navegacao, historico, e cross-flow.

**Risco**: Qualquer alteracao pode introduzir regressoes silenciosas. A logica de `treatHistory` e `dispatch` e particularmente fragil sem testes.

**Coverage threshold a 0%** no jest.config.js - nao ha protecao contra degradacao.

---

### P2. Estado Global Mutavel e Memory Leaks

**Severidade**: Alta

- `_cachedSteps` (variavel global fora da classe Flow) acumula referencias a componentes lazy-loaded eternamente
- `LoggerHelper._groups` e estado global mutavel
- O singleton pattern do FlowManager com `_instance` nao limpa entre navegacoes de SPA

**Risco**: Memory leaks em aplicacoes long-running, problemas com HMR durante desenvolvimento, impossibilidade de SSR correto.

---

### P3. Bug no `splice` vs `slice` no treatHistory

**Severidade**: Alta

```tsx
// Linha 383-384 de flow.model.tsx
this.history = this.history.splice(0, firstStepOccurrenceIndex + 1);
```

`Array.splice()` modifica o array in-place E retorna os elementos removidos. Isto cria comportamento incorreto:
1. O array original e mutado (elementos sao removidos)
2. A variavel recebe os elementos removidos (nao os restantes)

**Deveria ser**: `this.history = this.history.slice(0, firstStepOccurrenceIndex + 1)`

Este bug ocorre **duas vezes** (linhas 383 e 397).

---

### P4. Side Effects no Render

**Severidade**: Media-Alta

O metodo `Flow.render()` chama `this.mount()` que dispara listeners. Em React StrictMode (e React 19 por defeito), o render pode ser chamado multiplas vezes, causando listeners duplicados.

```tsx
// flow.model.tsx:216-218
if (!this.lastRenderStepName || this.lastRenderStepName !== this.currentStepName) {
  this.mount(); // SIDE EFFECT no render!
}
```

---

### P5. Incompatibilidade com React StrictMode

**Severidade**: Media-Alta

- `FlowProvider` inicializa fora de `useEffect` (linhas 223-226)
- O `forceUpdate` pattern com useState counter nao e concurrent-safe
- Refs mutados durante render (nao em effects)

React 19 intensifica StrictMode com double-rendering. O codigo atual pode produzir comportamento incorreto.

---

### P6. Tipagem Fraca (DX Comprometida)

**Severidade**: Media

- `TScreen.actions: any` - o tipo mais usado perde toda a inferencia
- `FlowManager<any, any, any, any>` no contexto - 4 generics perdidos
- `as any` em 15+ locais - casting que silencia o compilador
- Payloads como `Record<string, any>` - nenhuma validacao de schema

**Risco**: Erros de typo em nomes de acoes nao sao detetados em compile-time. A promessa de type-safety e parcial.

---

### P7. Seguranca: Prototype Pollution

**Severidade**: Media

Uso extensivo de `obj.hasOwnProperty(key)` em vez de `Object.hasOwn(obj, key)` (ES2022). Se um atacante conseguir poluir o prototype, `hasOwnProperty` pode ser overridden.

Locais: `flow.model.tsx` (5x), `flowManager.model.ts` (3x)

---

### P8. Acoplamento ao Browser

**Severidade**: Media

- `document.startViewTransition` sem guard de SSR
- `window.history.replaceState` direto
- Nenhum suporte a SSR/RSC (React Server Components)

**Risco**: Impossibilidade de usar em Next.js, Remix, ou qualquer framework SSR.

---

### P9. Acessibilidade (a11y)

**Severidade**: Media

Zero consideracoes de acessibilidade:
- Sem `aria-live` para anunciar mudancas de step
- Sem focus management apos navegacao
- Sem role/aria-label nos containers
- Placeholder sem texto alternativo para screen readers

---

### P10. Dependencias Desatualizadas

**Severidade**: Baixa-Media

- ESLint 6 (2019) - 4 major versions atras
- Prettier 1 (2019) - 2 major versions atras
- Jest 26 (2020) - 3 major versions atras
- Varias vulnerabilidades potenciais em deps antigas

---

### P11. Internacionalizacao

**Severidade**: Baixa

`UnexpectedError` tem mensagem hardcoded em portugues. Sem sistema de i18n para mensagens da biblioteca.

---

### P12. Documentacao

**Severidade**: Baixa

- README.md basico sem exemplos de uso
- JSDoc minimo (apenas em `clearAllHistory` e tipos)
- Sem CONTRIBUTING.md
- Sem MIGRATION guide entre versoes
- TypeDoc configurado mas sem cobertura significativa
