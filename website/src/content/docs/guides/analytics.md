---
title: Analytics
description: Page views, funnels and actions to GA4, Segment or your own tool.
---

:::note[v2 equivalent]
In v2 analytics was a `listen` callback that you wrote and filtered yourself.
:::

`react-flow-app/analytics` turns the [event contract](/guides/events/) into analytics calls. It is a Provider adapter:

```tsx
import { segment } from 'react-flow-app/analytics';

<FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={[browserHistory(), segment({ actions })]} />;
```

Out of the box, every adapter sends:

- **a page view per step**, titled from the screen's `meta.title` (or the step name), with the step path and the previous step as
  referrer;
- **flow start and exit events** for funnels (`flow_start` / `flow_exit` in GA4, `Flow Started` / `Flow Exited` in Segment).

## Actions are opt-in

Payloads may carry personal data, so no action is sent unless you list it. Names and payloads are typed from your screens:

```ts
segment({
	actions: {
		checkout: payload => ({ name: 'Checkout Started', properties: { loggedIn: payload.loggedIn } }),
		pay: payload => (payload.ok ? { name: 'Payment Submitted' } : false), // false skips the call
		finish: 'Order Completed', // a name without properties
	},
});
```

The mapping also receives where the action happened: `(payload, { flow, step, url, navigationId, overlay })`.

## Options

| Option    | What it does                                                                                  |
| --------- | --------------------------------------------------------------------------------------------- |
| `actions` | Which actions are sent, and with what.                                                        |
| `page`    | `false` to turn page views off, or a function returning `{ title?, properties? }` or `false`. |
| `flows`   | `false` to turn flow start and exit events off.                                               |
| `enabled` | Consent: while it returns `false`, nothing is sent or queued.                                 |

## GA4

```ts
import { ga4 } from 'react-flow-app/analytics';

ga4({ actions: { pay: payload => ({ name: 'payment_submitted', properties: { ok: payload.ok } }) } });
```

:::caution[Turn off the automatic page view]
In a single-page app GA4 would count page views twice. Configure gtag with `send_page_view: false`, and turn off _Page changes based on
browser history events_ in Enhanced measurement.
:::

`gtag` and Segment's `analytics` are looked up on every call, so the snippets can load late, or be blocked by an ad blocker, without
errors.

## Your own tool

```ts
import { analytics } from 'react-flow-app/analytics';

analytics({
	page: view => myTool.screen(view.title, { path: view.path }),
	track: call => myTool.event(call.name, call.properties),
});
```
