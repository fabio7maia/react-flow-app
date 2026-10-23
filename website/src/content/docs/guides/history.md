---
title: History and back
description: How the history works, the step options that shape it, and keeping screens mounted.
---

Every forward navigation keeps the step you leave in the history; `back()` returns to the last one. The rules are the v2 rules, checked
by a parity suite that runs the v2 scenarios against v3.

## Options that shape the history

- **`ignoreHistory`** on a step: when you leave it, it is not kept. Typical for an error step: after _Try again_, back skips it.
- **`ignoreHistory`** on a dispatch: `dispatch('next', undefined, { ignoreHistory: true })` does not keep the current step, once.
- **`clearHistory`** on a step: entering it clears the history. Typical for a confirmation: back cannot return to the payment.
- **`allowCyclicHistory`**: by default, going forward to a step already in the history cuts the history back to it, so back never loops.
  With the option, the step can appear several times. Every step that repeats needs it.

## Back

- From the UI: `useFlow(screen).back()`, with `canGoBack` to show or hide the button.
- Across flows: back from the first step of a flow opened with `goto` returns to the step that opened it.
- With no history, `back()` does not navigate and emits `back:empty`, so the app can react (close a webview, for example).
- The browser back button is mapped to `back()` by the [`browserHistory`](/guides/urls/) adapter.

## Starting with a history

`initial` accepts a history, so back works from a step opened directly:

```tsx
<FlowProvider app={flowApp} initial={{ flow: 'checkout', step: 'payment', history: ['cart'] }} />
```

From code, `useFlowEngine().start(flow, step, { history, clearHistory })` does the same at any time.

## Keeping the previous screen mounted

`keepPreviousMounted` on a step keeps the previous step of the flow mounted, hidden, while that step is active. Its state, refs and DOM
survive, and back shows it again without remounting it. The typical case is list → detail: the list keeps its filters and scroll.

```ts
const catalog = defineFlow({
	name: 'catalog',
	steps: {
		products: { screen: productsScreen, initial: true },
		product: { screen: productScreen, keepPreviousMounted: true },
		basket: { screen: basketScreen },
	},
});
```

- Consecutive steps with the option stack up: list → detail → more keeps both list and detail.
- Moving forward to a step without the option unmounts the kept screens.
- A kept screen reads its own URL params with `useStepParams`, not those of the current step.
- Only flows that use the option wrap each screen in an element (`display: contents` when visible, `display: none` when hidden).
