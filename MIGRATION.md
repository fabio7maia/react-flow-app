# Migrating from v2 to v3

v3 keeps the v2 navigation model (screens dispatch actions, flows decide where they go) and the v2 history rules (`ignoreHistory`,
`clearHistory`, `allowCyclicHistory`, resuming flows). It changes how flows are declared: as data, one file per screen and one per flow,
typed through a single `Register`. A parity suite runs the 41 v2 characterization scenarios against v3
([`test/parity.test.ts`](./test/parity.test.ts)): 21 behave the same, 16 the same through another API, and 4 differ on purpose (listed
below).

v2 keeps receiving fixes on the `latest` npm tag; v3 ships as pre-releases (`alpha`, then `beta` and `rc`) until it is stable.

## At a glance

| v2                                                                  | v3                                                                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `screens = { name: { actions, loader } }` in one object             | `defineScreen({ name, actions, meta, loader })`, one file per screen                                             |
| Actions as a string array                                           | Same, or an object with payload types: `{ pay: payload<{ ok: boolean }>(), cancel: null }`                       |
| `new FlowManager(screens, anotherObjects)`                          | `createFlowApp([flows])` + `declare module 'react-flow-app' { interface Register { app } }`                      |
| `fm.flow({ name, baseUrl }).steps({ … })`                           | `defineFlow({ name, baseUrl, steps: { step: { screen, …options } } })`                                           |
| `f.step('a')({ next: 'b' })`                                        | `flow.transitions({ a: { next: 'b' } })`                                                                         |
| An action as a function returning `otherFlow.navigateTo('x')`       | `goto('otherFlow', 'x')` (checked by name, no import of the other flow)                                          |
| `otherFlow.navigateTo()` without a step                             | `goto('otherFlow')`: resumes the flow at its last step                                                           |
| An action as a function that decides                                | `branch(['a', 'b'], (ctx, payload) => …)` with the targets declared                                              |
| An action as a function without a return value                      | `effect((ctx, payload) => …)`                                                                                    |
| `fromFlow` / `backExit`                                             | `goto.exit()` and the `flow:exit` event                                                                          |
| `anotherObjects` + `f.anotherObject('modal')({ … })`                | `overlays: { modal: modalScreen }` + `flow.transitions({ modal: { … } })`                                        |
| Step options `initialStep`, `url`, `ignoreHistory`, `clearHistory`… | `initial`, `url` (now with typed `:params`), `ignoreHistory`, `clearHistory`, `allowCyclicHistory`, `entrypoint` |
| `<FlowProvider fm={fm} initialFlowName="f" initialStepName="s" />`  | `<FlowProvider app={flowApp} initial={{ flow: 'f', step: 's' }} adapters={[…]} />`                               |
| `withUrl` / `scrollRestoration` props                               | `adapters={[browserHistory(), scrollRestoration()]}`                                                             |
| `useFlow(screen)` → `dispatch`, `back`, `hasPreviousStep`           | `useFlow(screen)` → `dispatch`, `back`, `canGoBack` (from `react-flow-app/react`)                                |
| `getHistory`, `getCurrentStep`, `getLastAction`                     | `useFlowSelector(snapshot => …)` (`history`, `flow`, `step`, `params`)                                           |
| `useFlowManager().start({ flowName, stepName, options })`           | `useFlowEngine().start(flow, step, { clearHistory, history, params })`                                           |
| `listen`, `f.listen({ type })`, `onFlowMount` / `onFlowUnmount`     | `useFlowEvents(type, cb)`, `engine.on(type, cb)` or `createFlowApp(…, { integrations })`                         |
| Event `mount` / `dispatch` / `back`                                 | `step:enter` / `action` / `step:leave` with `reason: 'back'`; plus `flow:start`, `flow:exit`                     |

## Step by step

1. **Split the screens.** Move each entry of the v2 `screens` object to `screens/<name>/<name>.screen.ts` with `defineScreen`. The loader
   now returns the module (`() => import('./Payment')`), not a `React.lazy` component. Add payload types where actions carry data.
2. **Write one flow per file.** `defineFlow` with the steps, then `flow.transitions({ … })` with what used to be `f.step('x')({ … })`.
   Replace functions with `goto`, `branch` or `effect`. `branch` needs every possible target listed; add `samples` so generated tests can
   walk each branch.
3. **Compose and register.** `createFlowApp([…])` in `app.flow.ts`, plus the `Register` augmentation (and `meta` if your screens have
   metadata).
4. **Swap the Provider.** `FlowProvider` comes from `react-flow-app/react`. URLs and scroll restoration become adapters.
5. **Move listeners to events.** Analytics usually becomes `segment()` or `ga4()` from `react-flow-app/analytics`; anything else
   becomes `useFlowEvents` or an app integration.
6. **Check the result.** `npx react-flow-app check --app src/app.flow.ts --write` validates the flows and writes the diagram. Commit both
   files.

## Behaviour changes

- **Actions without a transition** emit `action:unhandled` (v2 ignored them silently). (C05)
- **`back()` without history** emits `back:empty` so the app can react, e.g. close a webview (v2 did nothing). (C07)
- **Overlays** work without extra configuration. A v2 `anotherObject` without a `name` was ignored, which was a bug. (X08)
- **The browser back button navigates the flow.** v3 pushes a history entry per step; v2 only replaced the URL. (U01)
- After a cycle without `allowCyclicHistory`, v3 keeps an empty history where v2 kept the current step in it. Back does not navigate in
  either version. (H05)
- Event order is always `action → step:leave → step:enter`, and every event of a navigation shares a `navigationId`.
- A transition without `params` keeps the URL params of the step's last visit.
