# react-flow-app - Funcionalidades e Exemplos

## Indice

1. [Definicao de Screens](#1-definicao-de-screens)
2. [Criacao de Flows](#2-criacao-de-flows)
3. [Configuracao de Steps e Actions](#3-configuracao-de-steps-e-actions)
4. [FlowProvider - Integracao React](#4-flowprovider---integracao-react)
5. [Navegacao com useFlow](#5-navegacao-com-useflow)
6. [Gestao Global com useFlowManager](#6-gestao-global-com-useflowmanager)
7. [Navegacao Cross-Flow](#7-navegacao-cross-flow)
8. [Event Listeners](#8-event-listeners)
9. [Gestao de Historico](#9-gestao-de-historico)
10. [URL Sync](#10-url-sync)
11. [Animacoes e View Transitions](#11-animacoes-e-view-transitions)
12. [Lazy Loading](#12-lazy-loading)
13. [Error Boundary](#13-error-boundary)
14. [Custom Templates](#14-custom-templates)
15. [Another Objects (Acoes Externas)](#15-another-objects-acoes-externas)
16. [Logger Configuravel](#16-logger-configuravel)
17. [Lifecycle Handlers](#17-lifecycle-handlers)

---

## 1. Definicao de Screens

Screens sao a unidade basica - representam um ecra com acoes possiveis e um loader lazy.

```tsx
import React from 'react';

export const screens = {
  login: {
    actions: ['submit', 'forgotPassword'] as const,
    loader: () => React.lazy(() => import('./LoginScreen')),
  },
  dashboard: {
    actions: ['logout', 'settings'] as const,
    loader: () => React.lazy(() => import('./DashboardScreen')),
  },
  settings: {
    actions: ['save', 'cancel'] as const,
    loader: () => React.lazy(() => import('./SettingsScreen')),
  },
} as const;
```

**Notas:**
- `actions` define as acoes disponiveis nesse ecra (tipadas como tuple com `as const`)
- `loader` retorna um `React.lazy` para code-splitting automatico
- `as const` no final garante inferencia literal dos nomes de acoes

---

## 2. Criacao de Flows

Um Flow agrupa screens numa sequencia logica com transicoes definidas.

```tsx
import { FlowManager } from 'react-flow-app';

// Criar o FlowManager com os screens
const fm = new FlowManager(screens);

// Criar um flow com nome e URL base
const authFlow = fm.flow({
  name: 'auth',
  baseUrl: 'auth',
}).steps({
  login: {},                          // step simples
  dashboard: { clearHistory: true },  // limpa historico ao entrar
  settings: { ignoreHistory: false }, // comportamento default
});
```

---

## 3. Configuracao de Steps e Actions

Cada step tem acoes que mapeiam para outros steps.

```tsx
// Navegacao simples entre steps
authFlow.step('login')({
  submit: 'dashboard',       // acao 'submit' vai para 'dashboard'
  forgotPassword: 'settings', // acao 'forgotPassword' vai para 'settings'
});

authFlow.step('dashboard')({
  logout: 'login',
  settings: 'settings',
});

authFlow.step('settings')({
  save: 'dashboard',
  cancel: 'dashboard',
});
```

### Opcoes de Step

```tsx
const flow = fm.flow({ name: 'example', baseUrl: 'app' }).steps({
  step1: {
    initialStep: true,         // Marca como step inicial do flow
  },
  step2: {
    url: 'custom-url-segment', // URL customizado em vez do nome do step
    ignoreHistory: true,       // Nao adiciona ao historico (back salta este step)
  },
  step3: {
    clearHistory: true,        // Limpa todo o historico ao entrar
  },
  step4: {
    allowCyclicHistory: true,  // Permite repeticoes no historico
  },
  step5: {
    checkpoint: true,          // Marca como checkpoint
  },
});
```

---

## 4. FlowProvider - Integracao React

O FlowProvider envolve a aplicacao e fornece o contexto de navegacao.

### Modo Simples (render automatico)

```tsx
import { FlowProvider } from 'react-flow-app';

const App = () => (
  <FlowProvider
    fm={fm}
    initialFlowName="auth"
  />
);
```

### Modo com Opcoes

```tsx
const App = () => (
  <FlowProvider
    fm={fm}
    initialFlowName="auth"
    initialStepName="dashboard"      // Step inicial especifico
    initialHistory={['login']}       // Pre-preencher historico
    options={{
      animation: true,               // Ativar animacao de loading
      withUrl: true,                  // Sincronizar URL
    }}
  />
);
```

---

## 5. Navegacao com useFlow

O hook `useFlow` e usado dentro de cada screen para navegar.

```tsx
import { useFlow } from 'react-flow-app';
import { screens } from './screens';

const LoginScreen = () => {
  const {
    dispatch,         // Executa uma acao
    back,             // Volta ao step anterior
    getCurrentStep,   // Retorna step atual { flowName, name }
    getHistory,       // Retorna array do historico
    getLastAction,    // Retorna 'back' | 'dispatch' | undefined
    getPreviousStep,  // Retorna step anterior { flowName, name }
    hasPreviousStep,  // Retorna boolean
    clearHistory,     // Limpa historico
    refresh,          // Forca re-render
  } = useFlow(screens.login);

  const handleSubmit = () => {
    // Executa a acao 'submit' definida na configuracao
    dispatch('submit');
  };

  const handleSubmitWithPayload = () => {
    // Dispatch com payload (disponivel nos listeners)
    dispatch('submit', { username: 'user@mail.com' });
  };

  return (
    <div>
      <h1>Login</h1>
      {hasPreviousStep() && (
        <button onClick={back}>Voltar</button>
      )}
      <button onClick={handleSubmit}>Entrar</button>
    </div>
  );
};
```

**Nota:** O `screen` passado ao `useFlow` garante que o TypeScript valida os nomes das acoes no `dispatch`.

---

## 6. Gestao Global com useFlowManager

O hook `useFlowManager` permite controlo ao nivel do FlowManager.

```tsx
import { useFlowManager } from 'react-flow-app';

const Navigation = () => {
  const {
    currentFlowName,   // Nome do flow atual
    start,             // Inicia/navega para um flow
    clearAllHistory,   // Limpa historico global ou por flow
  } = useFlowManager();

  const goToSettings = () => {
    start({
      flowName: 'settings',
      stepName: 'general',       // opcional
      options: { clearHistory: true }, // opcional
    });
  };

  const resetAll = () => {
    clearAllHistory();            // Limpa tudo
    // ou
    clearAllHistory('auth');      // Limpa apenas flow 'auth'
  };

  return (
    <div>
      <p>Flow atual: {currentFlowName}</p>
      <button onClick={goToSettings}>Definicoes</button>
      <button onClick={resetAll}>Reset</button>
    </div>
  );
};
```

---

## 7. Navegacao Cross-Flow

Permite navegar entre flows diferentes usando funcoes callback nas acoes.

```tsx
// Definir dois flows
const authFlow = fm.flow({ name: 'auth', baseUrl: 'auth' })
  .steps({ login: {}, register: {} });

const mainFlow = fm.flow({ name: 'main', baseUrl: 'app' })
  .steps({ home: {}, profile: {} });

// Acao que navega para outro flow
authFlow.step('login')({
  submit: () => {
    // Navega para o flow 'main', step 'home'
    return mainFlow.navigateTo('home');
  },
});

// navigateTo() retorna: { flowName: 'main', stepName: 'home' }

// Tambem funciona com start() para obter dados de navegacao
const startData = mainFlow.start('home');
// startData = { flowName: 'main', stepName: 'home' }
```

### Navegacao com opcoes

```tsx
authFlow.step('login')({
  submit: () => {
    return mainFlow.navigateTo('home', {
      clearHistory: true,  // Limpa historico ao navegar
    });
  },
});

// Com historico customizado
authFlow.step('login')({
  submit: () => {
    return {
      flowName: 'main',
      stepName: 'home',
      options: {
        history: ['login', 'verify'],  // Define historico manual
      },
    };
  },
});
```

---

## 8. Event Listeners

Sistema de eventos para reagir a navegacao.

### Tipos de eventos

| Tipo | Descricao |
|------|-----------|
| `all` | Todos os eventos |
| `mount` | Quando um step e montado |
| `back` | Quando o utilizador navega para tras |
| `backExit` | Quando back sai do flow atual |
| `dispatch` | Quando uma acao e executada |

### Listeners por flow

```tsx
// Listener para todos os eventos
f0.listen((input) => {
  console.log('Evento:', input.type, input.flowName, input.currentStepName);
});

// Listener para tipo especifico
f0.listen({
  callback: (input) => {
    console.log('Dispatch:', input.dispatch?.actionName, input.dispatch?.payload);
  },
  type: 'dispatch',
});

f0.listen({
  callback: (input) => {
    console.log('Step montado:', input.currentStepName);
    console.log('URL:', input.url);
  },
  type: 'mount',
});

f0.listen({
  callback: (input) => {
    console.log('Back executado:', input.currentStepName);
  },
  type: 'back',
});
```

### Listener global no Provider

```tsx
<FlowProvider
  fm={fm}
  initialFlowName="auth"
  listen={(input) => {
    // Executado para TODOS os flows
    analytics.track('flow_event', {
      type: input.type,
      flow: input.flowName,
      step: input.currentStepName,
      action: input.dispatch?.actionName,
    });
  }}
/>
```

### Estrutura do input do listener

```tsx
type TFlowListenCallbackInput = {
  url: string;                    // URL construido
  flowName: string;               // Nome do flow
  currentStepName: string;        // Step atual
  type: TFlowListen;             // Tipo do evento
  dispatch?: {                    // Dados do dispatch (se aplicavel)
    actionName?: string;
    payload?: Record<string, any>;
  };
  options?: {                     // Opcoes do step
    clearHistory?: boolean;
    ignoreHistory?: boolean;
  };
};
```

---

## 9. Gestao de Historico

### Configuracao por step

```tsx
const flow = fm.flow({ name: 'wizard', baseUrl: 'wizard' }).steps({
  intro: {},                          // Normal - adicionado ao historico
  terms: { ignoreHistory: true },     // Salta no back
  form: { allowCyclicHistory: true }, // Permite aparecer multiplas vezes
  confirm: { clearHistory: true },    // Limpa tudo ao entrar
});
```

### API programatica

```tsx
const { getHistory, clearHistory, hasPreviousStep, getPreviousStep } = useFlow(screen);

// Verificar historico
console.log(getHistory());        // ['intro', 'terms', 'form']
console.log(hasPreviousStep());   // true
console.log(getPreviousStep());   // { flowName: 'wizard', name: 'form' }

// Limpar historico
clearHistory();
```

### Historico inicial

```tsx
<FlowProvider
  fm={fm}
  initialFlowName="wizard"
  initialStepName="form"
  initialHistory={['intro', 'terms']}  // Pre-preencher para deep-linking
/>
```

### Prevencao de ciclos

Por defeito, o sistema previne historicos ciclicos. Se um step ja existe no historico, o historico e truncado ate esse ponto para evitar loops infinitos no back.

```
Historico: [A, B, C, D, B]
Apos prevencao: [A, B]  (truncado na primeira ocorrencia de B)
```

---

## 10. URL Sync

Sincronizacao automatica do URL com hash-based routing.

```tsx
// Ativado por defeito
<FlowProvider
  fm={fm}
  initialFlowName="auth"
  options={{ withUrl: true }}  // default: true
/>

// URL resultante: http://localhost/#/auth/login
// Apos dispatch: http://localhost/#/auth/dashboard
```

### URL customizado por step

```tsx
const flow = fm.flow({ name: 'auth', baseUrl: 'authentication' }).steps({
  login: { url: 'sign-in' },           // /authentication/sign-in
  register: { url: 'create-account' }, // /authentication/create-account
  dashboard: {},                        // /authentication/dashboard (nome do step)
});
```

### Desativar URL sync

```tsx
<FlowProvider
  fm={fm}
  initialFlowName="auth"
  options={{ withUrl: false }}
/>
```

---

## 11. Animacoes e View Transitions

### Opcoes de animacao

```tsx
// Animacao default (Placeholder spinner)
<FlowProvider fm={fm} initialFlowName="auth" options={{ animation: true }} />

// Sem animacao
<FlowProvider fm={fm} initialFlowName="auth" options={{ animation: false }} />

// Animacao customizada
<FlowProvider
  fm={fm}
  initialFlowName="auth"
  options={{
    animation: <MyCustomLoader />,
  }}
/>
```

### View Transitions API

A biblioteca usa automaticamente a View Transitions API quando disponivel no browser:

```tsx
// Internamente, o FlowProvider faz:
if (document.startViewTransition) {
  document.startViewTransition(() => {
    // re-render com transicao suave
  });
}
```

Para customizar as transicoes, adicionar CSS:

```css
::view-transition-old(root) {
  animation: fade-out 0.3s ease-in;
}

::view-transition-new(root) {
  animation: fade-in 0.3s ease-out;
}
```

---

## 12. Lazy Loading

Todos os screens sao carregados via `React.lazy` com `Suspense` automatico.

```tsx
// Definicao do screen com lazy loading
const screens = {
  heavyScreen: {
    actions: ['next'],
    loader: () => React.lazy(() => import('./HeavyScreen')),
  },
};

// O Flow.render() automaticamente envolve em Suspense:
// <React.Suspense fallback={<Placeholder loading />}>
//   <Screen />
// </React.Suspense>
```

**Cache**: Screens ja carregados sao cached para evitar re-loading durante back navigation.

---

## 13. Error Boundary

Componente para capturar erros em screens.

```tsx
import { ErrorBoundary, UnexpectedError } from 'react-flow-app';

// Uso basico
<ErrorBoundary>
  <FlowProvider fm={fm} initialFlowName="auth" />
</ErrorBoundary>

// Com mensagem customizada
<ErrorBoundary
  containerErrorMessage={(error) => (
    <div>
      <h2>Erro inesperado</h2>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Recarregar</button>
    </div>
  )}
>
  <FlowProvider fm={fm} initialFlowName="auth" />
</ErrorBoundary>
```

---

## 14. Custom Templates

Usar `children` no FlowProvider com `StepRender` para layouts customizados.

```tsx
import { FlowProvider, StepRender } from 'react-flow-app';
import { useFlow, useFlowManager } from 'react-flow-app';

const Header = () => {
  const { currentFlowName } = useFlowManager();
  const { back, hasPreviousStep } = useFlow();

  return (
    <header>
      <h1>Flow: {currentFlowName}</h1>
      {hasPreviousStep() && <button onClick={back}>Voltar</button>}
    </header>
  );
};

const Footer = () => <footer>Copyright 2024</footer>;

const App = () => (
  <FlowProvider fm={fm} initialFlowName="auth">
    <Header />
    <main>
      <StepRender />  {/* Renderiza o step atual */}
    </main>
    <Footer />
  </FlowProvider>
);
```

---

## 15. Another Objects (Acoes Externas)

Permite registar acoes de componentes externos (ex: modais, sidebars) que nao sao steps do flow.

```tsx
// Definir another objects
const anotherObjects = {
  confirmModal: { actions: ['confirm', 'cancel'] },
  sidebar: { actions: ['navigate'] },
} as const;

// Criar FlowManager com another objects
const fm = new FlowManager(screens, anotherObjects);

const flow = fm.flow({ name: 'app', baseUrl: 'app' }).steps({
  home: {},
  checkout: {},
});

// Configurar acoes para another objects
flow.anotherObject('confirmModal')({
  confirm: 'checkout',
  cancel: 'home',
});
```

---

## 16. Logger Configuravel

Sistema de logging por grupos para debug.

```tsx
import { LoggerHelper } from 'react-flow-app';

// Ativar todos os logs
LoggerHelper.init({
  all: true,
});

// Ativar logs especificos
LoggerHelper.init({
  all: false,
  Flow: true,       // Logs do modelo Flow
  components: true,  // Logs dos componentes
});

// Configuracao granular por tipo
LoggerHelper.init({
  all: false,
  Flow: {
    log: true,
    error: true,
    warn: false,
  },
});
```

---

## 17. Lifecycle Handlers

Callbacks executados quando flows sao montados/desmontados.

```tsx
<FlowProvider
  fm={fm}
  initialFlowName="auth"
  onFlowMount={{
    auth: () => {
      console.log('Auth flow montado');
      analytics.track('auth_flow_start');
    },
    main: () => {
      console.log('Main flow montado');
      fetchUserData();
    },
  }}
  onFlowUnmount={{
    auth: () => {
      console.log('Auth flow desmontado');
      clearAuthTemp();
    },
  }}
/>
```

---

## Exports Disponiveis

```tsx
// Components
export { ErrorBoundary } from 'react-flow-app';
export { Placeholder } from 'react-flow-app';
export { StepRender } from 'react-flow-app';
export { UnexpectedError } from 'react-flow-app';

// Hooks
export { useFlow } from 'react-flow-app';
export { useFlowManager } from 'react-flow-app';
export { useLogger } from 'react-flow-app';

// Models
export { Flow } from 'react-flow-app';
export { FlowManager } from 'react-flow-app';
export { Step } from 'react-flow-app';

// Providers
export { FlowProvider } from 'react-flow-app';
export { flowManagerContext } from 'react-flow-app';

// Helpers
export { CoreHelper } from 'react-flow-app';
export { LoggerHelper } from 'react-flow-app';

// Types (all exported)
export type { TScreen, TScreens, TFlowManagerOptions, ... } from 'react-flow-app';
```
