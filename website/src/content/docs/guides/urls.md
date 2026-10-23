---
title: URLs and the browser
description: The browser history adapter, deep links, typed URL params and scroll restoration.
---

The engine has no DOM. URLs and the browser back button come from an optional adapter, so the same flows run in React Native, in
embedded widgets and in Node tests.

## browserHistory

```ts
import { browserHistory } from 'react-flow-app';

browserHistory(); // hash URLs: /#/checkout/pay/42
browserHistory({ mode: 'path', basename: '/app' }); // /app/checkout/pay/42
```

The URL of a step is `/{baseUrl}/{step url or name}`. The adapter:

- **pushes** a browser entry on forward navigation, and **replaces** it when leaving an `ignoreHistory` step, cutting a cycle or after
  `clearHistory`;
- maps the **browser back button** to `back()`. With no history left, the browser leaves the app, so the user is never trapped. When
  the app is the first page of the tab (nowhere to leave to), it stays on the current step and restores its URL;
- keeps the browser in step when back comes **from the UI**;
- does not navigate on the browser **forward** button (the engine has no forward): it restores the URL of the current step.

## Deep links

Only steps marked `entrypoint` open from a URL. Any other URL of a flow opens its initial step, so a user never lands in the middle of
a checkout without its data. An unknown URL starts at the Provider's `initial`.

## Typed URL params

Params are declared in the step `url`, and typed from it:

```ts
payment: { screen: paymentScreen, url: 'pay/:orderId' },
```

```tsx
dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } }); // navigates to /checkout/pay/42
const { orderId } = useStepParams('checkout', 'payment'); // { orderId: string }
engine.start('checkout', 'payment', { params: { orderId: '42' } }); // { id: '42' } does not compile
```

A transition without `params` keeps those of the step's last visit (after _Try again_, the payment keeps its `orderId`). Going back
restores the params of that step.

## Scroll restoration

```ts
import { scrollRestoration } from 'react-flow-app';

scrollRestoration(); // window scroll
scrollRestoration({ get: () => el.scrollTop, set: top => el.scrollTo({ top }) }); // a scroll container
```

Going back restores the step's position once its screen is actually mounted (after lazy loading), not after a fixed timeout. Moving
forward scrolls to the top.
