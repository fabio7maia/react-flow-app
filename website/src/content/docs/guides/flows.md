---
title: Flows and transitions
description: Steps, step options, and every kind of transition target.
---

:::note[v2 equivalent]
In v2 a flow was `fm.flow({ … }).steps({ … })` and transitions were `f.step('x')({ … })`, with functions that called `navigateTo`.
:::

A flow is a set of steps (each one a screen) and the transitions between them.

```ts
import { defineFlow } from 'react-flow-app';

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
```

## Step options

| Option                | What it does                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `initial`             | The step the flow starts on (defaults to the first declared step).                               |
| `entrypoint`          | The step can be opened directly by URL (a deep link).                                            |
| `url`                 | URL segment, defaults to the step name. Supports typed params: `'pay/:orderId'`.                 |
| `ignoreHistory`       | When leaving this step, it is not kept in the history.                                           |
| `clearHistory`        | Entering this step clears the history.                                                           |
| `allowCyclicHistory`  | The step can appear more than once in the history.                                               |
| `keepPreviousMounted` | While this step is active, the previous one stays mounted (hidden). See [history](/guides/history/). |

## Transitions

Transitions are a separate statement. For each step, each action of its screen maps to a target:

```ts
checkoutFlow.transitions({
	cart: { checkout: 'payment' },
	payment: { pay: 'success', cancel: 'cart' },
});
```

Only steps of the flow are valid keys, and only actions of the step's screen; a misspelled step suggests the right one.

:::note[Why a separate statement]
If transitions were part of `defineFlow`, two flows that `goto` each other would make each flow's type depend on the other: a circular
type. As a separate statement, the type of a flow depends only on its steps.
:::

## Targets

| Target                         | Meaning                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `'payment'`                    | A step of the same flow.                                                                   |
| `goto('auth', 'login')`        | A step of another flow, checked by name against `Register` (no import of the other flow). |
| `goto('auth')`                 | Another flow, resumed at the last step it was in (or its initial step).                   |
| `goto.exit()`                  | Back to the step that opened the current flow.                                             |
| `branch(targets, resolve, …)`  | One of several declared targets, chosen from the payload.                                 |
| `effect(fn)`                   | A side effect without navigation.                                                          |

### branch

```ts
pay: branch(['success', 'failure'], (ctx, payload) => (payload.ok ? 'success' : 'failure'), {
	samples: { success: { ok: true }, failure: { ok: false } },
}),
```

- `payload` is typed from the action (`{ ok: boolean }` here). `ctx` has `flow`, `step` and `history`.
- The resolver can only return one of the declared targets. That is what lets the diagram and the validation see every path without
  running your code.
- `samples` give a payload per target. [Generated tests](/guides/testing/) use them to walk each branch, and `validateFlows` warns when
  one is missing.

### goto.exit()

A flow opened from another one (for example a login opened from the cart) can return to whoever opened it:

```ts
authFlow.transitions({
	login: { loggedIn: goto.exit(), cancel: goto.exit() },
});
```

## Overlays

Modals and panels whose actions navigate (v2: `anotherObjects`) are overlays: screens that are not steps.

```ts
const mailFlow = defineFlow({
	name: 'mail',
	steps: { inbox: { screen: inboxScreen, initial: true }, message: { screen: messageScreen } },
	overlays: { help: helpScreen },
});

mailFlow.transitions({
	inbox: { open: 'message' },
	help: { goToInbox: 'inbox', close: effect(() => undefined) },
});
```

The step's component renders the overlay itself; inside it, `useFlow(helpScreen).dispatch(…)` uses the overlay's transitions. Overlays
are nodes of the graph and are validated, but they never enter the history.
