---
title: Quick start
description: A screen, a flow, the app and the Provider, in four files.
---

This page builds a small checkout: a cart, a payment step with a URL param, and success or failure.

## 1. A screen per file

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

The component dispatches those actions. `dispatch` is typed from the screen: `dispatch('pay')` without a payload, or with
`{ ok: 'yes' }`, does not compile.

```tsx
// screens/payment/Payment.tsx
import { useFlow, useStepParams } from 'react-flow-app/react';
import { paymentScreen } from './payment.screen';

export default function Payment() {
	const { dispatch, back, canGoBack } = useFlow(paymentScreen);
	const { orderId } = useStepParams('checkout', 'payment'); // { orderId: string }

	return (
		<>
			<h1>Payment for order {orderId}</h1>
			<button onClick={() => dispatch('pay', { ok: true })}>Pay</button>
			<button onClick={() => dispatch('cancel')}>Cancel</button>
			{canGoBack && <button onClick={back}>Back</button>}
		</>
	);
}
```

## 2. A flow per file

Steps reference screens; transitions map each action of each step to a target.

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

The [flows guide](/guides/flows/) covers every kind of target.

## 3. The app, registered once

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

`Register` turns on the global typing: `goto('checkout', '…')` suggests only checkout steps, events know every action and payload, and
every screen's `meta` must match. See [typing](/guides/typing/).

## 4. The Provider

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

That is the whole app. To see it running, open the [demo](/demo/), which is this checkout with the devtools around it.
