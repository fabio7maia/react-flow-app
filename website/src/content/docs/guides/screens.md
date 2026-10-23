---
title: Screens
description: Declare a screen, its actions and payloads, its metadata and its lazy-loaded component.
---

:::note[v2 equivalent]
In v2 screens were entries of one `screens` object with `actions` as a list of names and a `loader` returning a `React.lazy` component.
:::

A screen is the unit a user sees. Its definition says **what the user can do** (actions), not where that leads: navigation lives in the
flows.

```ts
import { defineScreen, payload } from 'react-flow-app';

export const paymentScreen = defineScreen({
	name: 'payment',
	actions: { pay: payload<{ ok: boolean }>(), cancel: null },
	meta: { title: 'Payment', funnel: 'checkout' },
	loader: () => import('./Payment'),
});
```

## Actions

- **Without payloads**, list them: `actions: ['next', 'back2a']`.
- **With payloads**, use an object: `payload<T>()` declares the payload type, and `null` an action without one.

No `as const` is needed: names and payloads are inferred.

## Metadata

`meta` is whatever your app needs per screen: a page title for analytics, a funnel, a breadcrumb label. Its type comes from
`Register['meta']`, so every screen is checked against it. The analytics adapters use `meta.title` for page views.

## The component

`loader` returns the module of the component, and its default export is the screen. Keep the definition (`*.screen.ts`) apart from the
component (`*.tsx`): flows import definitions, and the component is only downloaded when the step is visited.

```tsx
import { useFlow } from 'react-flow-app/react';
import { paymentScreen } from './payment.screen';

export default function Payment() {
	const { dispatch, back, canGoBack } = useFlow(paymentScreen);
	// dispatch('pay', { ok: true }) — the payload is required and typed
	// dispatch('cancel')            — no payload
	// dispatch('finish')            — does not compile: not an action of this screen
	return null;
}
```

`dispatch` also takes navigation options as its third argument: `{ ignoreHistory?: boolean; params?: Record<string, string> }`.

:::note[Why the loader returns `unknown`]
The type of `loader` does not require a React component. With `ComponentType`, TypeScript would have to infer the component's type to
check the screen, and the component calls `useFlow(screen)`: a circular type. The library checks the default export at runtime instead.
:::

## Using a screen twice

The same screen can be a step in several flows, or twice in the same flow under different step names. Each step has its own
transitions.
