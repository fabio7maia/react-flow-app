# react-flow-app

Event-based navigation for React. Screens dispatch **actions**; **flows** declared as data decide where each action goes. Because the
navigation is data, you get a diagram of every flow, tests generated from the graph, analytics from one event stream, and end-to-end
typing with intellisense.

> **v3 is in alpha** (`npm install react-flow-app@alpha`). v2 stays on `latest`.
> **Documentation:** [react-flow-app-pr.vercel.app](https://react-flow-app-pr.vercel.app) · [migration guide from v2](https://react-flow-app-pr.vercel.app/migration/v2-to-v3/) · [demo](https://react-flow-app-pr.vercel.app/demo/)

- 🤳 **Event based**: screens dispatch actions; they never import other screens or call `navigate`
- 🗺️ **Diagram of every flow**, generated from the code (Mermaid, or your own renderer)
- 🧪 **Generated tests and transition coverage**, from the same graph
- 📈 **Analytics from one event stream** (GA4 and Segment adapters, opt-in actions, consent)
- 💯 **Typed end to end**: actions, payloads, cross-flow targets, URL params, screen metadata and events
- 🔗 **URLs, deep links and the browser back button** through an optional adapter
- 📦 **One file per screen, one per flow**, lazy-loaded components
- 🧩 **Headless core**: the engine has no DOM and runs in Node tests

## Install

```bash
npm install react-flow-app@alpha
```

React 18 or 19. The core (`react-flow-app`) works without React; the React binding lives in `react-flow-app/react`.

## Quick start

### 1. A screen per file

A screen declares its actions (with payload types) and lazy-loads its component. The definition has no UI, so flows can import it
without loading any.

```ts
// screens/payment/payment.screen.ts
import { defineScreen, payload } from 'react-flow-app';

export const paymentScreen = defineScreen({
	name: 'payment',
	actions: { pay: payload<{ ok: boolean }>(), cancel: null },
	meta: { title: 'Payment' },
	loader: () => import('./Payment'),
});
```

```tsx
// screens/payment/Payment.tsx
import { useFlow, useStepParams } from 'react-flow-app/react';
import { paymentScreen } from './payment.screen';

export default function Payment() {
	const { dispatch } = useFlow(paymentScreen);
	const { orderId } = useStepParams('checkout', 'payment'); // { orderId: string }

	return (
		<>
			<h1>Payment for order {orderId}</h1>
			<button onClick={() => dispatch('pay', { ok: true })}>Pay</button>
			<button onClick={() => dispatch('cancel')}>Cancel</button>
		</>
	);
}
```

### 2. A flow per file

Steps reference screens; transitions map each action of each step to a target. `goto` targets another flow by name, checked by the
compiler, so flows never import each other.

```ts
// flows/checkout.flow.ts
import { branch, defineFlow, goto } from 'react-flow-app';
import { cartScreen } from '../screens/cart/cart.screen';
import { failureScreen } from '../screens/failure/failure.screen';
import { paymentScreen } from '../screens/payment/payment.screen';
import { successScreen } from '../screens/success/success.screen';

export const checkoutFlow = defineFlow({
	name: 'checkout',
	baseUrl: 'checkout',
	steps: {
		cart: { screen: cartScreen, initial: true, entrypoint: true },
		payment: { screen: paymentScreen, url: 'pay/:orderId' },
		success: { screen: successScreen, clearHistory: true },
		failure: { screen: failureScreen, ignoreHistory: true },
	},
});

checkoutFlow.transitions({
	cart: {
		checkout: branch(['payment', goto('auth', 'login')], (_, p) => (p.loggedIn ? 'payment' : goto('auth', 'login')), {
			samples: { payment: { loggedIn: true }, 'auth.login': { loggedIn: false } },
		}),
	},
	payment: {
		pay: branch(['success', 'failure'], (_, p) => (p.ok ? 'success' : 'failure'), {
			samples: { success: { ok: true }, failure: { ok: false } },
		}),
		cancel: 'cart',
	},
	failure: { retry: 'payment' },
	success: { finish: goto('home', 'dashboard') },
});
```

- A string target is a step of the same flow; `goto(flow, step)` is another flow; `goto(flow)` resumes it where it was; `goto.exit()`
  returns to the step that opened the current flow.
- `branch` declares every possible target, so the diagram shows them all without running your code. `samples` give the generated tests
  a payload for each branch.
- `effect(fn)` runs a side effect without navigating.
- Step options keep the v2 semantics: `initial`, `entrypoint`, `url`, `ignoreHistory`, `clearHistory`, `allowCyclicHistory` and
  `keepPreviousMounted` (the previous step stays mounted, hidden, while this one is active: list → detail keeps the list's state).

### 3. The app, registered once

```ts
// app.flow.ts
import { createFlowApp } from 'react-flow-app';
import { authFlow } from './flows/auth.flow';
import { checkoutFlow } from './flows/checkout.flow';
import { homeFlow } from './flows/home.flow';

export const flowApp = createFlowApp([homeFlow, checkoutFlow, authFlow]);

declare module 'react-flow-app' {
	interface Register {
		app: typeof flowApp;
		meta: { title: string };
	}
}
```

`Register` turns on the global typing: `goto('checkout', '…')` suggests only checkout steps, events know every action and payload,
`useStepParams` knows each step's URL params, and every screen's `meta` must match.

### 4. The Provider

```tsx
import { browserHistory, scrollRestoration } from 'react-flow-app';
import { segment } from 'react-flow-app/analytics';
import { FlowProvider } from 'react-flow-app/react';
import { flowApp } from './app.flow';

export function App() {
	return (
		<FlowProvider
			app={flowApp}
			initial={{ flow: 'home' }}
			adapters={[browserHistory(), scrollRestoration(), segment()]}
			fallback={<p>Loading…</p>}
		/>
	);
}
```

Each Provider owns its engine: no global singleton, so several flows can run side by side.

## Events

Every navigation emits a stable, ordered set of events (the [v1 contract](./rfcs/api-v3/00-comparativo.md#contrato-de-eventos-prioridades-1-e-2)):

| Navigation                | Events (same `navigationId`)                                        |
| ------------------------- | ------------------------------------------------------------------- |
| Start                     | `flow:start` → `step:enter`                                         |
| Action within a flow      | `action` → `step:leave` → `step:enter`                              |
| Action to another flow    | `action` → `step:leave` → `flow:exit` → `flow:start` → `step:enter` |
| `back()`                  | `step:leave` → (`flow:exit` → `flow:start`) → `step:enter`          |
| `back()` without history  | `back:empty`                                                        |
| Action without transition | `action:unhandled`                                                  |

Every event carries `flow`, `step`, `navigationId`, `timestamp` and the step `url`. Navigations requested from a listener run after the
current one finishes (run-to-completion), and a failing listener never breaks navigation.

```tsx
import { useFlowEvents } from 'react-flow-app/react';

useFlowEvents('action', event => {
	if (event.action === 'pay') console.log(event.payload.ok); // payload typed from the screen
});
```

Outside React: `createFlowApp(flows, { integrations: [event => …] })` receives the events of every instance.

### Analytics

```ts
import { ga4, segment } from 'react-flow-app/analytics';

segment({
	actions: {
		// Opt-in: only listed actions are sent, with what you pick from the payload.
		pay: payload => ({ name: 'Payment Submitted', properties: { ok: payload.ok } }),
		finish: 'Order Completed',
	},
	enabled: () => consent.analytics,
});
```

Both adapters send a page view per step (titled from `meta.title`) and flow start/exit events for funnels. With GA4 in a single-page app,
turn off the automatic page view (`send_page_view: false`) and the history-based page views in Enhanced measurement.

## URLs and the browser

`browserHistory({ mode: 'hash' | 'path', basename })` writes the URL of each step, pushes on forward navigation, and maps the browser back
button to `back()`. Only `entrypoint` steps open from a deep link; any other URL of a flow opens its initial step. URL params are typed from
the step pattern (`'pay/:orderId'` → `{ orderId: string }`); a transition without `params` keeps those of the step's last visit.

`scrollRestoration()` restores the scroll position on back, once the screen is mounted.

## Diagram, validation and tests

```ts
import { toGraph, toMermaid, validateFlows } from 'react-flow-app';
import { getPaths } from 'react-flow-app/testing';

toMermaid(toGraph(flowApp)); // diagram of every flow
validateFlows(flowApp); // actions without transitions, unreachable steps, flows without an initial step…

for (const path of getPaths(flowApp, 'home.dashboard')) {
	test(`reaches ${path.target}`, () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		for (const step of path.steps) engine.dispatch(step.action, step.payload);
		expect(`${engine.getSnapshot().flow}.${engine.getSnapshot().step}`).toBe(path.target);
	});
}
// engine.coverage() lists the transitions no test walked.
```

### `react-flow-app check`

```bash
npx react-flow-app check --app src/app.flow.ts --write   # writes flows.graph.json and FLOWS.md
npx react-flow-app check                                 # CI: fails on errors or a stale snapshot
npx react-flow-app check --base origin/main --report flows-report.md
```

The graph snapshot and the Mermaid diagram live in the repo, so every PR that changes navigation shows it in the diff. With `--base`, the
check writes a summary of new, removed and changed steps and transitions, with a highlighted diagram, for the PR.

## Documentation

The [documentation site](https://react-flow-app-pr.vercel.app) lives in [`website/`](./website) (Astro Starlight): guides, the migration guide from v2, the API reference and
the demo. `yarn docs:dev` runs it locally; it deploys to Vercel (`vercel.json`).

## Examples, Storybook and demo

[`examples/store`](./examples/store) is a small store (three flows) used by the tests, the e2e suite and the demo.

`yarn storybook` opens the examples, one feature per story (basic flow, history options, branch, overlays, the store across flows,
analytics), each with an inspector: current step, history, a live map of the flow and the event log. It also hosts the interactive demo
(the store in a simulated browser, with the generated tests and a PR review diff). `yarn demo` builds the demo as a single page.

## Development

```bash
yarn test          # Vitest: engine, event contract, v2 parity, adapters, analytics, testing, CLI, React (jsdom)
yarn typecheck     # types and type tests
yarn completions   # real intellisense at key points of the API
yarn e2e           # real browsers (E2E_BROWSERS=chromium,firefox,webkit)
yarn bench 50 6    # type-check benchmark: 50 flows × 6 steps
yarn build && yarn smoke   # build and test the packed package
yarn storybook     # examples and the demo
yarn changeset     # describe your change for the changelog
```

The design is documented in [`rfcs/api-v3`](./rfcs/api-v3).

## License

MIT
