# Examples

Ready-to-use code examples for **react-flow-app**. Copy-paste and adapt.

---

## Table of Contents

1. [Screen Definitions (with metadata)](#1-screen-definitions)
2. [Flow Definitions (with entrypoints)](#2-flow-definitions)
3. [App Setup & Provider](#3-app-setup--provider)
4. [Cross-Flow Navigation](#4-cross-flow-navigation)
5. [URL Entrypoints](#5-url-entrypoints)
6. [Analytics Integration (Google Analytics)](#6-analytics-integration)
7. [Full Example — Auth + CRUD App](#7-full-example--auth--crud-app)
8. [Animations & Accessibility](#8-animations--accessibility)
9. [Flow Diagram Visualization](#9-flow-diagram-visualization)
10. [Dispatch with Payload](#10-dispatch-with-payload)

---

## 1. Screen Definitions

Screens are **shared UI building blocks** — they can be reused across multiple flows.

```tsx
// screens.ts
import { defineScreens } from 'react-flow-app';

export const screens = defineScreens({
  // ─── Auth screens ──────────────────────────────────────────
  login: {
    actions: ['submit', 'forgotPassword', 'goToRegister'] as const,
    loader: () => import('./screens/LoginScreen'),
    meta: {
      url: '/auth/login',
      title: 'Login',
      analyticsCategory: 'auth',
    },
  },
  register: {
    actions: ['submit', 'goToLogin'] as const,
    loader: () => import('./screens/RegisterScreen'),
    meta: {
      url: '/auth/register',
      title: 'Register',
      analyticsCategory: 'auth',
    },
  },
  forgotPassword: {
    actions: ['submit', 'backToLogin'] as const,
    loader: () => import('./screens/ForgotPasswordScreen'),
    meta: {
      url: '/auth/forgot-password',
      title: 'Forgot Password',
      analyticsCategory: 'auth',
    },
  },
  emailVerification: {
    actions: ['verify', 'resend'] as const,
    loader: () => import('./screens/EmailVerificationScreen'),
    meta: {
      url: '/auth/verify-email',
      title: 'Verify Email',
      analyticsCategory: 'auth',
    },
  },

  // ─── CRUD screens ─────────────────────────────────────────
  itemList: {
    actions: ['create', 'edit', 'delete', 'view', 'logout'] as const,
    loader: () => import('./screens/ItemListScreen'),
    meta: {
      url: '/items',
      title: 'Items',
      analyticsCategory: 'crud',
    },
  },
  itemForm: {
    actions: ['save', 'cancel'] as const,
    loader: () => import('./screens/ItemFormScreen'),
    meta: {
      url: '/items/form',
      title: 'Item Form',
      analyticsCategory: 'crud',
    },
  },
  itemDetail: {
    actions: ['edit', 'delete', 'back'] as const,
    loader: () => import('./screens/ItemDetailScreen'),
    meta: {
      url: '/items/detail',
      title: 'Item Detail',
      analyticsCategory: 'crud',
    },
  },
  deleteConfirmation: {
    actions: ['confirm', 'cancel'] as const,
    loader: () => import('./screens/DeleteConfirmationScreen'),
    meta: {
      url: '/items/delete',
      title: 'Confirm Delete',
      analyticsCategory: 'crud',
    },
  },

  // ─── Common screens ───────────────────────────────────────
  dashboard: {
    actions: ['goToItems', 'goToProfile', 'logout'] as const,
    loader: () => import('./screens/DashboardScreen'),
    meta: {
      url: '/dashboard',
      title: 'Dashboard',
      analyticsCategory: 'main',
    },
  },
  profile: {
    actions: ['save', 'back'] as const,
    loader: () => import('./screens/ProfileScreen'),
    meta: {
      url: '/profile',
      title: 'Profile',
      analyticsCategory: 'settings',
    },
  },
});
```

---

## 2. Flow Definitions

Each flow defines **which screens it uses**, their **step options**, and
**transitions** (action → next step).

```tsx
// flows.ts
import { defineFlow } from 'react-flow-app';
import { screens } from './screens';

// ─── Registration flow ──────────────────────────────────────────────────────

export const registerFlow = defineFlow({
  name: 'register',
  baseUrl: 'auth',
  steps: {
    register: {
      initialStep: true,
      url: 'register',
      entrypoint: true,       // http://localhost/auth/register → enters here
    },
    emailVerification: {
      url: 'verify-email',
    },
    login: {
      url: 'login',
      clearHistory: true,     // clears history when navigating to login
    },
  },
  transitions: {
    register: {
      submit: 'emailVerification',
      goToLogin: 'login',
    },
    emailVerification: {
      verify: 'login',
      resend: 'emailVerification',
    },
    login: {
      // handled by loginFlow — cross-flow navigation below
    },
  },
} as const);

// ─── Login flow ─────────────────────────────────────────────────────────────

export const loginFlow = defineFlow({
  name: 'login',
  baseUrl: 'auth',
  steps: {
    login: {
      initialStep: true,
      url: 'login',
      entrypoint: true,       // http://localhost/auth/login → enters here
      clearHistory: true,     // fresh start
    },
    forgotPassword: {
      url: 'forgot-password',
      entrypoint: true,       // http://localhost/auth/forgot-password → enters here
    },
    register: {
      url: 'register',
    },
    dashboard: {
      url: 'dashboard',
      clearHistory: true,
    },
  },
  transitions: {
    login: {
      submit: 'dashboard',
      forgotPassword: 'forgotPassword',
      goToRegister: 'register',
    },
    forgotPassword: {
      submit: 'login',
      backToLogin: 'login',
    },
    register: {
      // delegate to registerFlow for the full registration experience
      submit: () => ({ flowName: 'register', stepName: 'emailVerification' }),
      goToLogin: 'login',
    },
    dashboard: {
      // cross-flow: go to the CRUD flow
      goToItems: () => ({ flowName: 'crud', stepName: 'itemList' }),
      goToProfile: () => ({ flowName: 'crud', stepName: 'profile' }),
      logout: 'login',
    },
  },
} as const);

// ─── CRUD flow ──────────────────────────────────────────────────────────────

export const crudFlow = defineFlow({
  name: 'crud',
  baseUrl: 'app',
  steps: {
    itemList: {
      initialStep: true,
      url: 'items',
      entrypoint: true,       // http://localhost/app/items → enters here
      checkpoint: true,       // always accessible via back()
    },
    itemForm: {
      url: 'items/form',
    },
    itemDetail: {
      url: 'items/detail',
    },
    deleteConfirmation: {
      url: 'items/delete',
      ignoreHistory: true,    // modal-like — does not pollute back stack
    },
    dashboard: {
      url: 'dashboard',
      entrypoint: true,       // http://localhost/app/dashboard → enters here
    },
    profile: {
      url: 'profile',
    },
  },
  transitions: {
    itemList: {
      create: 'itemForm',
      edit: 'itemForm',
      delete: 'deleteConfirmation',
      view: 'itemDetail',
      // cross-flow: back to auth on logout
      logout: () => ({ flowName: 'login', stepName: 'login' }),
    },
    itemForm: {
      save: 'itemList',
      cancel: 'itemList',
    },
    itemDetail: {
      edit: 'itemForm',
      delete: 'deleteConfirmation',
      back: 'itemList',
    },
    deleteConfirmation: {
      confirm: 'itemList',
      cancel: 'itemList',
    },
    dashboard: {
      goToItems: 'itemList',
      goToProfile: 'profile',
      logout: () => ({ flowName: 'login', stepName: 'login' }),
    },
    profile: {
      save: 'dashboard',
      back: 'dashboard',
    },
  },
} as const);
```

---

## 3. App Setup & Provider

Wire everything together with `createFlowApp` and mount the `FlowProvider`.

```tsx
// app.ts — create the flow app instance
import { createFlowApp } from 'react-flow-app';
import { screens } from './screens';
import { loginFlow, registerFlow, crudFlow } from './flows';

export const {
  FlowProvider,
  useFlow,
  useFlowManager,
  useFlowState,
  useFlowHistory,
  useFlowListener,
  useFlowDiagram,
  getDiagram,
  store,
} = createFlowApp({
  screens,
  flows: {
    login: loginFlow,
    register: registerFlow,
    crud: crudFlow,
  },
  options: {
    withUrl: true,                // sync URL hash on navigation
    animation: 'slide',           // direction-aware slide transitions
    animationDuration: 300,
    a11y: {
      announceStepChange: true,   // screen reader announcements
      manageFocus: true,          // auto-focus after navigation
      liveRegionPoliteness: 'polite',
    },
  },
});
```

```tsx
// main.tsx — mount the provider
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FlowProvider } from './app';

// If the URL matches an entrypoint (e.g. /app/items), it navigates there.
// Otherwise, falls back to initialFlow="login".
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FlowProvider
      initialFlow="login"
      errorFallback={<div>Something went wrong. Please refresh.</div>}
    >
      {/* Optional: global elements outside the step area */}
      <footer>© 2026 My App</footer>
    </FlowProvider>
  </React.StrictMode>
);
```

---

## 4. Cross-Flow Navigation

Navigate between flows programmatically using `useFlowManager` or
via function transitions.

### 4a. Via transition functions (declarative)

```tsx
// In flow definition — transitions can return a cross-flow target:
transitions: {
  dashboard: {
    goToItems: () => ({ flowName: 'crud', stepName: 'itemList' }),
    logout:    () => ({ flowName: 'login', stepName: 'login' }),
  },
}
```

### 4b. Via `useFlowManager` (imperative)

```tsx
// DashboardScreen.tsx
import { useFlowManager } from './app';

export default function DashboardScreen() {
  const { start, currentFlowName, currentStepName, clearHistory } = useFlowManager();

  return (
    <div>
      <p>Current: {currentFlowName} / {currentStepName}</p>

      <button onClick={() => start({ flowName: 'crud', stepName: 'itemList' })}>
        Go to Items
      </button>

      <button onClick={() => {
        clearHistory();
        start({ flowName: 'login' });
      }}>
        Logout (clear history)
      </button>
    </div>
  );
}
```

---

## 5. URL Entrypoints

Steps marked with `entrypoint: true` can be reached directly by URL.

```
URL pattern:  /{flow.baseUrl}/{step.url}

http://localhost/auth/login          → loginFlow > login
http://localhost/auth/register       → registerFlow > register
http://localhost/auth/forgot-password → loginFlow > forgotPassword
http://localhost/app/items           → crudFlow > itemList
http://localhost/app/dashboard       → crudFlow > dashboard
http://localhost/                    → no match → initialFlow (login)
```

Both `pathname` and `hash` are checked:

```
http://localhost/app/items          ✓  (pathname match)
http://localhost/#/app/items        ✓  (hash match)
http://localhost/#app/items         ✓  (hash without leading /)
```

Steps **without** `entrypoint: true` are only reachable through navigation:

```
http://localhost/app/items/form     ✗  itemForm has no entrypoint
                                       → falls back to initialFlow
```

---

## 6. Analytics Integration

Use `useFlowListener` to forward navigation events and metadata to Google
Analytics (or any third-party service) in one place.

```tsx
// AnalyticsProvider.tsx
import { useFlowListener } from './app';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useFlowListener('all', (event) => {
    // ── Page view on every screen transition ──────────────────────
    if (event.meta?.url) {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: event.meta.url,
        page_title: event.meta.title,
      });
    }

    // ── Custom event on dispatch ──────────────────────────────────
    if (event.type === 'dispatch') {
      gtag('event', event.action!, {
        event_category: (event.meta?.analyticsCategory as string) ?? 'navigation',
        flow_name: event.flowName,
        step_name: event.stepName,
        // payload from the component (e.g. { itemId: 42 })
        ...(event.payload as Record<string, unknown>),
      });
    }

    // ── Track back exits (user tried to go back with no history) ──
    if (event.type === 'backExit') {
      gtag('event', 'back_exit', {
        event_category: 'navigation',
        flow_name: event.flowName,
        step_name: event.stepName,
      });
    }
  });

  return <>{children}</>;
}
```

```tsx
// main.tsx — wrap FlowProvider with analytics
<FlowProvider initialFlow="login">
  <AnalyticsProvider>
    <footer>© 2026 My App</footer>
  </AnalyticsProvider>
</FlowProvider>
```

---

## 7. Full Example — Auth + CRUD App

Complete screen components showing dispatch with payload, back navigation,
and cross-flow transitions.

### 7a. Login Screen

```tsx
// screens/LoginScreen.tsx
import { useState } from 'react';
import { useFlow } from '../app';
import { screens } from '../screens';

export default function LoginScreen() {
  const { dispatch, back } = useFlow(screens.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Payload is forwarded to flow listeners → analytics
    dispatch('submit', { email, method: 'email' });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Sign In</button>
      <button type="button" onClick={() => dispatch('forgotPassword')}>
        Forgot password?
      </button>
      <button type="button" onClick={() => dispatch('goToRegister')}>
        Create account
      </button>
    </form>
  );
}
```

### 7b. Register Screen

```tsx
// screens/RegisterScreen.tsx
import { useState } from 'react';
import { useFlow } from '../app';
import { screens } from '../screens';

export default function RegisterScreen() {
  const { dispatch } = useFlow(screens.register);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch('submit', { name: form.name, email: form.email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create Account</h1>
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Full name"
        required
      />
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        placeholder="Password"
        required
      />
      <button type="submit">Register</button>
      <button type="button" onClick={() => dispatch('goToLogin')}>
        Already have an account?
      </button>
    </form>
  );
}
```

### 7c. Item List Screen (CRUD — listing)

```tsx
// screens/ItemListScreen.tsx
import { useFlow } from '../app';
import { screens } from '../screens';

type Item = { id: number; name: string };

const MOCK_ITEMS: Item[] = [
  { id: 1, name: 'Widget A' },
  { id: 2, name: 'Widget B' },
  { id: 3, name: 'Gadget C' },
];

export default function ItemListScreen() {
  const { dispatch } = useFlow(screens.itemList);

  return (
    <div>
      <h1>Items</h1>
      <button onClick={() => dispatch('create', { mode: 'create' })}>
        + New Item
      </button>

      <ul>
        {MOCK_ITEMS.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <button onClick={() => dispatch('view', { itemId: item.id })}>
              View
            </button>
            <button onClick={() => dispatch('edit', { itemId: item.id, mode: 'edit' })}>
              Edit
            </button>
            <button onClick={() => dispatch('delete', { itemId: item.id, itemName: item.name })}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <hr />
      <button onClick={() => dispatch('logout')}>Logout</button>
    </div>
  );
}
```

### 7d. Item Form Screen (CRUD — create / edit)

```tsx
// screens/ItemFormScreen.tsx
import { useState } from 'react';
import { useFlow } from '../app';
import { screens } from '../screens';

export default function ItemFormScreen() {
  const { dispatch, back } = useFlow(screens.itemForm);
  const [name, setName] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch('save', { name });
  };

  return (
    <form onSubmit={handleSave}>
      <h1>Item Form</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        required
      />
      <button type="submit">Save</button>
      <button type="button" onClick={() => dispatch('cancel')}>
        Cancel
      </button>
      <button type="button" onClick={back}>
        ← Back
      </button>
    </form>
  );
}
```

### 7e. Item Detail Screen (CRUD — view)

```tsx
// screens/ItemDetailScreen.tsx
import { useFlow } from '../app';
import { screens } from '../screens';

export default function ItemDetailScreen() {
  const { dispatch, back } = useFlow(screens.itemDetail);

  return (
    <div>
      <h1>Item Detail</h1>
      <p>Details for the selected item.</p>

      <button onClick={() => dispatch('edit', { mode: 'edit' })}>Edit</button>
      <button onClick={() => dispatch('delete')}>Delete</button>
      <button onClick={() => dispatch('back')}>← Back to List</button>
      <button onClick={back}>← Back (history)</button>
    </div>
  );
}
```

### 7f. Delete Confirmation Screen

```tsx
// screens/DeleteConfirmationScreen.tsx
import { useFlow } from '../app';
import { screens } from '../screens';

export default function DeleteConfirmationScreen() {
  const { dispatch } = useFlow(screens.deleteConfirmation);

  return (
    <div>
      <h2>Are you sure?</h2>
      <p>This action cannot be undone.</p>
      <button onClick={() => dispatch('confirm', { confirmed: true })}>
        Yes, delete
      </button>
      <button onClick={() => dispatch('cancel')}>Cancel</button>
    </div>
  );
}
```

### 7g. Forgot Password Screen

```tsx
// screens/ForgotPasswordScreen.tsx
import { useState } from 'react';
import { useFlow } from '../app';
import { screens } from '../screens';

export default function ForgotPasswordScreen() {
  const { dispatch, back } = useFlow(screens.forgotPassword);
  const [email, setEmail] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); dispatch('submit', { email }); }}>
      <h1>Reset Password</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
      />
      <button type="submit">Send reset link</button>
      <button type="button" onClick={() => dispatch('backToLogin')}>
        ← Back to Login
      </button>
      <button type="button" onClick={back}>
        ← Back (history)
      </button>
    </form>
  );
}
```

### 7h. Dashboard Screen

```tsx
// screens/DashboardScreen.tsx
import { useFlow, useFlowState } from '../app';
import { screens } from '../screens';

export default function DashboardScreen() {
  const { dispatch } = useFlow(screens.dashboard);
  const { activeFlowName, activeStepName } = useFlowState();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Flow: <code>{activeFlowName}/{activeStepName}</code></p>

      <nav>
        <button onClick={() => dispatch('goToItems')}>Items</button>
        <button onClick={() => dispatch('goToProfile')}>Profile</button>
        <button onClick={() => dispatch('logout')}>Logout</button>
      </nav>
    </div>
  );
}
```

---

## 8. Animations & Accessibility

### 8a. Fade animation (simplest)

```tsx
createFlowApp({
  screens,
  flows: { login: loginFlow },
  options: {
    animation: 'fade',
    animationDuration: 200,
  },
});
```

### 8b. Slide animation (direction-aware)

```tsx
createFlowApp({
  screens,
  flows: { login: loginFlow },
  options: {
    animation: 'slide',          // slides right on dispatch, left on back()
    animationDuration: 300,
  },
});
```

### 8c. No animation

```tsx
createFlowApp({
  screens,
  flows: { login: loginFlow },
  options: {
    animation: false,            // or animation: 'none'
  },
});
```

### 8d. Full accessibility

```tsx
createFlowApp({
  screens,
  flows: { login: loginFlow },
  options: {
    animation: 'slide',
    a11y: {
      announceStepChange: true,           // aria-live region announces "Step: login (auth)"
      manageFocus: true,                  // focus moves to the step content after navigation
      liveRegionPoliteness: 'polite',     // 'assertive' for time-critical updates
    },
  },
});
```

The library also respects `prefers-reduced-motion` — animations are reduced to 1ms automatically.

---

## 9. Flow Diagram Visualization

Generate visual diagrams of your flows for documentation or debugging.

### 9a. Inside a component (hook)

```tsx
import { useFlowDiagram } from './app';

function FlowDebugPanel() {
  const diagram = useFlowDiagram();

  return (
    <div>
      <h3>Flow Graph</h3>
      <p>Nodes: {diagram.nodes.length} — Edges: {diagram.edges.length}</p>
      <pre>{JSON.stringify(diagram, null, 2)}</pre>
    </div>
  );
}
```

### 9b. Outside React (non-hook)

```tsx
import { getDiagram } from './app';

// Useful in tests, scripts, or CLI tools
const diagram = getDiagram();
console.log('Nodes:', diagram.nodes);
console.log('Edges:', diagram.edges);
```

### 9c. Mermaid diagram generation

```tsx
import { generateMermaid, toMermaid } from 'react-flow-app';
import { getDiagram } from './app';

const diagram = getDiagram();
const mermaid = toMermaid(diagram, {
  direction: 'LR',
  groupByFlow: true,
  includeActions: true,
  theme: 'default',
});
console.log(mermaid);
// Output (paste into https://mermaid.live):
// graph LR
//   subgraph login
//     login_login[login] -->|submit| login_dashboard[dashboard]
//     login_login -->|forgotPassword| login_forgotPassword[forgotPassword]
//     ...
//   end
```

### 9d. Built-in SVG component

```tsx
import { FlowDiagramView } from 'react-flow-app';
import { getDiagram } from './app';

function FlowViewer() {
  return <FlowDiagramView diagram={getDiagram()} />;
}
```

---

## 10. Dispatch with Payload

Payloads sent via `dispatch` are forwarded to **every** flow listener.

### 10a. Sending payload from a screen

```tsx
// In any screen component:
const { dispatch } = useFlow(screens.itemList);

// Simple action — no payload
dispatch('create');

// Action with payload — forwarded to listeners
dispatch('edit', { itemId: 42, itemName: 'Widget A' });
dispatch('delete', { itemId: 42, reason: 'user-requested' });
```

### 10b. Receiving payload in a listener

```tsx
useFlowListener('dispatch', (event) => {
  console.log(event);
  // {
  //   type: 'dispatch',
  //   flowName: 'crud',
  //   stepName: 'itemList',
  //   action: 'edit',
  //   payload: { itemId: 42, itemName: 'Widget A' },
  //   meta: { url: '/items', title: 'Items', analyticsCategory: 'crud' },
  // }

  // Forward to a service:
  analyticsService.track(event.action!, {
    ...event.meta,
    ...event.payload as Record<string, unknown>,
  });
});
```

### 10c. Listening to specific event types

```tsx
// Only mount events (step was shown)
useFlowListener('mount', (event) => {
  document.title = (event.meta?.title as string) ?? 'My App';
});

// Only back events
useFlowListener('back', (event) => {
  console.log('User went back to:', event.stepName);
});

// Back exit — no more history to go back to
useFlowListener('backExit', (event) => {
  console.log('Cannot go further back from:', event.stepName);
  // Maybe show a "leave app?" confirmation
});

// All events at once
useFlowListener('all', (event) => {
  console.log(`[${event.type}] ${event.flowName}/${event.stepName}`);
});
```

---

## Quick Reference — StepOptions

| Option               | Type      | Description                                             |
| -------------------- | --------- | ------------------------------------------------------- |
| `initialStep`        | `boolean` | First step of the flow                                  |
| `url`                | `string`  | URL segment for hash sync and entrypoint matching       |
| `entrypoint`         | `boolean` | Allow direct URL navigation to this step on app load    |
| `ignoreHistory`      | `boolean` | Don't add to back stack (modal-like)                    |
| `clearHistory`       | `boolean` | Reset navigation history when reaching this step        |
| `allowCyclicHistory` | `boolean` | Allow revisiting a step already in history              |
| `checkpoint`         | `boolean` | Mark as navigation waypoint (always reachable via back) |

## Quick Reference — ScreenMeta

| Field   | Type      | Description                                 |
| ------- | --------- | ------------------------------------------- |
| `url`   | `string`  | Page path for GA `page_view` tracking       |
| `title` | `string`  | Page title for GA `page_title` / `<title>`  |
| `[key]` | `unknown` | Any custom field (analytics labels, flags…) |

## Quick Reference — ListenEvent

| Field     | Type         | Description                                   |
| --------- | ------------ | --------------------------------------------- |
| `type`    | `string`     | `'mount'` · `'dispatch'` · `'back'` · `'backExit'` |
| `flowName`| `string`     | Active flow at time of event                  |
| `stepName`| `string`     | Active step at time of event                  |
| `action`  | `string?`    | Only present for `'dispatch'` events          |
| `payload` | `unknown?`   | Payload from `dispatch(action, payload)`      |
| `meta`    | `ScreenMeta?`| Metadata of the active screen                 |
