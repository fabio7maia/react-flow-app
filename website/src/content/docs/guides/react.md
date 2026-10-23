---
title: React
description: FlowProvider, the hooks, several flows on one page, and server rendering.
---

:::note[v2 equivalent]
v2's `<FlowProvider fm initialFlowName options listen />` is `<FlowProvider app initial adapters />`; `useFlow` has `canGoBack` instead of `hasPreviousStep()`.
:::

Everything React lives in `react-flow-app/react`.

## FlowProvider

```tsx
<FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={[browserHistory()]} fallback={<Spinner />}>
	<DocumentTitle />
</FlowProvider>
```

| Prop       | What it does                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `app`      | The app from `createFlowApp`.                                                                          |
| `initial`  | `{ flow, step?, history? }`. A deep link from an adapter wins over it.                                 |
| `adapters` | URL, scroll, analytics… Read on the first render only: they attach once per Provider.                  |
| `fallback` | Shown while a lazy screen loads (Suspense).                                                            |
| `children` | Rendered inside the flow context, after the screen: a good place for components that listen to events. |

Each Provider owns its engine. There is no global singleton, so two flows can run side by side on one page (a wizard in a drawer, for
example).

## Hooks

| Hook                            | Returns                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `useFlow(screen)`               | `dispatch` (typed by the screen), `back`, `canGoBack`.                                         |
| `useStepParams(flow, step)`     | The URL params of that step, typed from its pattern: `'pay/:orderId'` → `{ orderId: string }`. |
| `useFlowEvents(type, callback)` | Subscribes to events, typed by `Register`. `'*'` for every event.                              |
| `useFlowSelector(selector)`     | A value derived from the snapshot (`flow`, `step`, `history`, `params`); re-renders on change. |
| `useFlowEngine()`               | The engine: `start`, `back`, `clearHistory`, `urlOf`, `coverage`…                              |

```tsx
function Breadcrumbs() {
	const history = useFlowSelector(snapshot => snapshot.history);
	return <nav>{history.map(entry => `${entry.flow}.${entry.step}`).join(' › ')}</nav>;
}

function DocumentTitle() {
	useFlowEvents('step:enter', event => {
		document.title = event.meta?.title ?? event.step;
	});
	return null;
}
```

## Starting a flow from code

```tsx
function SettingsButton() {
	const engine = useFlowEngine();
	return <button onClick={() => engine.start('settings', 'general', { clearHistory: true })}>Settings</button>;
}
```

`start(flow)` without a step resumes the flow at the last step it was in.

## Server rendering and React Server Components

- The React entry is marked `'use client'`, so it works with the Next.js App Router: render `FlowProvider` from a client component.
- On the server there is no `window`: the `browserHistory` adapter skips the deep link and the Provider starts at `initial`. The first
  render already has the initial step; lazy screens show the `fallback` until they load on the client.
