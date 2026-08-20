# Plan de Implementacao - react-flow-app v2

## Visao

Reescrever o core da biblioteca `react-flow-app` como uma nova peca (`@react-flow-app/core` v2) com foco em 5 pilares:

1. **DX (Developer Experience)** - API intuitiva, zero-config, excelente autocompletion
2. **Suporte a features atuais** - 100% retrocompativel com funcionalidades existentes
3. **Typing e2e** - Type-safety completa desde a definicao ate ao dispatch
4. **Geracao automatica de diagramas** - Visualizacao dos fluxos implementados
5. **Automatizacao de dispatches com screenshots** - Testes visuais automatizados

---

## Fase 1: Foundation (Semanas 1-2)

### 1.1 Setup do Projeto

- [ ] Migrar para monorepo com workspaces (pnpm/turborepo)
  - `packages/core` - Logica principal
  - `packages/diagram` - Geracao de diagramas
  - `packages/screenshot` - Automatizacao de screenshots
  - `packages/devtools` - DevTools browser extension
  - `apps/docs` - Documentacao (Storybook + Docusaurus)
- [ ] Configurar Vitest em vez de Jest (compativel com Vite existente)
- [ ] Configurar ESLint 9 flat config
- [ ] Configurar React Compiler (babel plugin)
- [ ] Setup CI/CD atualizado (GitHub Actions)

### 1.2 Type System Foundation

- [ ] Criar novo sistema de tipos com inferencia completa
- [ ] Eliminar todos os `any` da API publica
- [ ] Implementar `satisfies` operator para validacao de configuracao
- [ ] Template literal types para action names

```typescript
// Objetivo: zero any, inferencia total
const screens = defineScreens({
  login: {
    actions: ['submit', 'forgotPassword'],
    loader: () => import('./LoginScreen'),
  },
});
// typeof screens.login.actions[number] = 'submit' | 'forgotPassword' (inferido)
```

### 1.3 Core Rewrite

- [ ] Converter `Flow` de class para functional (composable functions)
- [ ] Converter `FlowManager` para API funcional com builder pattern melhorado
- [ ] Implementar `useSyncExternalStore` para state management
- [ ] Eliminar force update pattern
- [ ] Corrigir bug splice/slice no treatHistory
- [ ] Mover side-effects para fora do render
- [ ] Adicionar SSR guards (`typeof window !== 'undefined'`)

---

## Fase 2: DX & Typing (Semanas 3-4)

### 2.1 Nova API (DX)

- [ ] Criar `defineScreens()` helper com inferencia automatica
- [ ] Criar `defineFlow()` helper com validacao de acoes em compile-time
- [ ] Criar `createFlowApp()` factory que retorna provider + hooks tipados
- [ ] Implementar error messages com links para docs

```typescript
// Nova API proposta
const { FlowProvider, useFlow, useFlowManager } = createFlowApp({
  screens: defineScreens({ ... }),
  flows: {
    auth: defineFlow({
      baseUrl: '/auth',
      steps: { login: {}, register: {} },
      transitions: {
        login: { submit: 'register' },  // TypeScript valida 'submit' como acao de login
        register: { back: 'login' },
      },
    }),
  },
});
```

### 2.2 Typing E2E

- [ ] Dispatch tipado: `dispatch('submit')` so aceita acoes do screen atual
- [ ] Payload tipado por acao: `dispatch('submit', { email: string })`
- [ ] `navigateTo` tipado: so aceita steps do flow alvo
- [ ] `start` tipado: so aceita flow names registados
- [ ] Exportar utility types para integracao (ex: `InferActions<typeof screens.login>`)

```typescript
// Objetivo: payload tipado por acao
type LoginPayloads = {
  submit: { email: string; password: string };
  forgotPassword: { email: string };
};

const { dispatch } = useFlow<typeof screens.login, LoginPayloads>();
dispatch('submit', { email: 'x', password: 'y' }); // OK
dispatch('submit', { email: 'x' });                 // TS Error: missing password
dispatch('invalid');                                  // TS Error: not an action
```

### 2.3 Hooks Melhorados

- [ ] `useFlowState()` - Acesso reativo ao estado completo
- [ ] `useFlowTransition()` - Hook com pending state (useTransition)
- [ ] `useFlowHistory()` - Hook dedicado ao historico
- [ ] `useFlowListener()` - Hook para subscribe a eventos
- [ ] `useFlowDiagram()` - Hook para aceder ao diagrama do flow

---

## Fase 3: Diagram Generation (Semanas 5-6)

### 3.1 Modelo de Dados do Diagrama

- [ ] Parser que extrai o grafo de navegacao a partir da configuracao dos flows
- [ ] Representacao como DAG (Directed Acyclic Graph) com nodes e edges
- [ ] Suporte a cross-flow edges
- [ ] Metadata por node (step options, actions disponiveis)

```typescript
type FlowDiagram = {
  nodes: Array<{
    id: string;
    flowName: string;
    stepName: string;
    actions: string[];
    options: TStepOptions;
    isInitial: boolean;
  }>;
  edges: Array<{
    from: string;
    to: string;
    action: string;
    isCrossFlow: boolean;
  }>;
};
```

### 3.2 Exportadores

- [ ] **Mermaid** - Gerar diagramas Mermaid.js (renderizavel em GitHub/GitLab)
- [ ] **DOT/Graphviz** - Para diagramas mais complexos
- [ ] **React Component** - Componente interativo para devtools/storybook
- [ ] **JSON** - Exportacao raw para integracao com ferramentas externas
- [ ] **SVG/PNG** - Exportacao estatica para documentacao

```typescript
import { generateDiagram } from '@react-flow-app/diagram';

// Gerar Mermaid
const mermaid = generateDiagram(fm, { format: 'mermaid' });
// graph LR
//   auth_login -->|submit| auth_dashboard
//   auth_login -->|forgotPassword| auth_settings
//   auth_dashboard -->|logout| auth_login

// Gerar como componente React
const FlowDiagramView = generateDiagram(fm, { format: 'react' });
<FlowDiagramView highlightCurrent onNodeClick={(node) => console.log(node)} />
```

### 3.3 CLI Tool

- [ ] `npx react-flow-app diagram` - Gera diagrama a partir do codigo
- [ ] `npx react-flow-app diagram --watch` - Regenera em cada alteracao
- [ ] `npx react-flow-app diagram --output docs/flow.svg` - Exporta ficheiro
- [ ] Integracao com Storybook (addon)

### 3.4 Storybook Addon

- [ ] Panel no Storybook que mostra o diagrama do flow ativo
- [ ] Highlight do step atual em tempo real
- [ ] Click num node para navegar diretamente para esse step
- [ ] Mostrar historico visual

---

## Fase 4: Screenshot Automation (Semanas 7-8)

### 4.1 Screenshot Engine

- [ ] Integracao com Playwright para captura automatica de screenshots
- [ ] Configuracao declarativa de cenarios de teste
- [ ] Suporte a viewports multiplos (mobile, tablet, desktop)
- [ ] Comparacao visual (visual regression testing)

```typescript
// Configuracao de screenshot automation
import { defineScreenshotPlan } from '@react-flow-app/screenshot';

const plan = defineScreenshotPlan({
  flows: fm,
  baseUrl: 'http://localhost:6006',
  viewports: ['mobile', 'tablet', 'desktop'],
  scenarios: [
    {
      name: 'Happy path - Login to Dashboard',
      flow: 'auth',
      steps: [
        { step: 'login', screenshot: true },
        { dispatch: 'submit', payload: { email: 'test@mail.com' } },
        { step: 'dashboard', screenshot: true, waitFor: '.dashboard-loaded' },
      ],
    },
  ],
});
```

### 4.2 Dispatch Automation

- [ ] Motor de execucao automatica de dispatches seguindo caminhos do grafo
- [ ] Geracao automatica de todos os caminhos possiveis (path enumeration)
- [ ] Screenshot em cada step apos dispatch
- [ ] Relatorio HTML com todas as screenshots organizadas por flow/step

```typescript
import { autoDispatch } from '@react-flow-app/screenshot';

// Executar automaticamente todos os caminhos
const report = await autoDispatch({
  fm,
  screenshotDir: './screenshots',
  maxDepth: 10,                    // Limitar profundidade para evitar loops
  beforeDispatch: async (step) => {
    // Preencher formularios automaticamente
    await fillForm(step.name);
  },
});

// report.paths = [
//   { path: ['login', 'dashboard', 'settings'], screenshots: [...] },
//   { path: ['login', 'register', 'dashboard'], screenshots: [...] },
// ]
```

### 4.3 Integracao CI/CD

- [ ] GitHub Action para gerar screenshots em cada PR
- [ ] Comparacao visual entre branches (visual diff)
- [ ] Comentario automatico no PR com screenshots do antes/depois
- [ ] Blocking em caso de visual regressions acima de threshold

```yaml
# .github/workflows/visual-regression.yml
- name: Visual Regression
  uses: react-flow-app/visual-regression@v1
  with:
    base-branch: main
    threshold: 0.1  # 10% tolerance
    screenshot-dir: ./screenshots
```

### 4.4 Documentacao Automatica

- [ ] Gerar pagina de documentacao com screenshots de cada step
- [ ] Incluir diagrama do flow com screenshots como thumbnails nos nodes
- [ ] Exportar como PDF para stakeholders
- [ ] Atualizar automaticamente com cada deploy

---

## Fase 5: DevTools & Polish (Semanas 9-10)

### 5.1 Browser DevTools Extension

- [ ] Panel no Chrome/Firefox DevTools
- [ ] Visualizacao em tempo real do flow ativo
- [ ] Timeline de eventos (dispatches, backs, mounts)
- [ ] Inspecao do historico
- [ ] Time-travel debugging (replay de acoes)

### 5.2 Acessibilidade

- [ ] `aria-live` para anunciar mudancas de step
- [ ] Focus management apos navegacao
- [ ] Reducao de movimento respeitando `prefers-reduced-motion`
- [ ] Testes com screen readers

### 5.3 Performance

- [ ] Benchmarks automatizados
- [ ] Lazy loading optimizado com preloading hints
- [ ] Bundle analysis no CI

### 5.4 Documentacao

- [ ] Docusaurus site com exemplos interativos
- [ ] Migration guide v1 -> v2
- [ ] API reference gerada automaticamente
- [ ] Video tutorials

---

## Timeline

| Fase | Semanas | Entregavel |
|------|---------|-----------|
| 1. Foundation | 1-2 | Monorepo + Core rewrite + Type system |
| 2. DX & Typing | 3-4 | Nova API + E2E typing + Hooks melhorados |
| 3. Diagrams | 5-6 | Geracao de diagramas + CLI + Storybook addon |
| 4. Screenshots | 7-8 | Automation engine + CI/CD + Visual regression |
| 5. Polish | 9-10 | DevTools + a11y + Docs + Performance |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Breaking changes na API | Alta | Alto | Manter v1 adapter/compatibility layer |
| React Compiler instavel | Media | Medio | Feature flag para ativar/desativar |
| Playwright flaky tests | Media | Medio | Retries + tolerance thresholds |
| Complexidade do type system | Media | Alto | Manter API simples, complexidade interna |
| Adocao por utilizadores | Media | Alto | Migration guide + codemods automaticos |
