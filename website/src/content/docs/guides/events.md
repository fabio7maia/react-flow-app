---
title: Events
description: The event contract every navigation emits, its order and its guarantees.
---

Every navigation emits a stable, ordered set of events. Integrations (analytics, logging, monitoring) build on this contract, so it is
pinned by tests: any change to names, fields or order is a contract change.

## Events

| Event              | Extra fields                                     | When                                                   |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------ |
| `flow:start`       | `source`: `initial`, `api`, `goto`, `back`       | A flow becomes active.                                 |
| `action`           | `action`, `payload` (typed), `overlay?`          | A screen dispatched an action that has a transition.   |
| `step:leave`       | `reason`: `dispatch`, `back`, `exit`, `start`    | The current step is left.                              |
| `flow:exit`        | `reason`: `goto`, `back`, `exit`, `start`        | The flow is no longer active.                          |
| `step:enter`       | `direction`: `forward`, `back`; `from?`; `meta?` | A step becomes active.                                 |
| `back:empty`       |                                                  | `back()` with no history.                              |
| `action:unhandled` | `action`                                         | An action without a transition (handy in development). |

Every event also carries `flow`, `step`, `navigationId`, `timestamp` and `url` (the URL of the step the event refers to, with its
params).

## Order

| Navigation                | Events (same `navigationId`)                                        |
| ------------------------- | ------------------------------------------------------------------- |
| Start                     | `flow:start` → `step:enter`                                         |
| Action within a flow      | `action` → `step:leave` → `step:enter`                              |
| Action to another flow    | `action` → `step:leave` → `flow:exit` → `flow:start` → `step:enter` |
| `goto.exit()`             | `action` → `step:leave` → `flow:exit` → `flow:start` → `step:enter` |
| `back()`                  | `step:leave` → (`flow:exit` → `flow:start`) → `step:enter`          |
| `back()` without history  | `back:empty`                                                        |
| Action without transition | `action:unhandled`                                                  |
| Action with `effect`      | `action`                                                            |

## Guarantees

- **One `navigationId` per navigation**, shared by its events and strictly increasing: correlate events, or measure the time between
  `action` and `step:enter` (lazy loading included).
- **Run-to-completion**: a navigation requested inside a listener (a redirect on `step:enter`, for example) runs after the current one
  has delivered all its events.
- **Delivery order**: listeners of the event type, then `'*'` listeners, then app integrations.
- **Errors are isolated**: a listener that throws never breaks the navigation or the other listeners.
- **No lost start events**: the Provider holds the start events until its children and adapters are subscribed, so the first page view
  is never missed.

## Listening

```tsx
// In React, typed by Register
useFlowEvents('action', event => {
	if (event.action === 'pay') console.log(event.payload.ok); // payload: { ok: boolean }
});

// Outside React, on an engine
engine.on('step:enter', event => sentry.addBreadcrumb({ message: `${event.flow}.${event.step}` }));

// For every instance, at the app level
createFlowApp(flows, { integrations: [event => monitoring.log(event)] });
```

Each event also has a named type (`StepEnterEvent`, `ActionEvent`, …) for code that handles only one.
