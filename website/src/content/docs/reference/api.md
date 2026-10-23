---
title: API reference
description: Every export, by entry point.
---

## `react-flow-app`

### Screens and flows

| Export                                             | Description                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `defineScreen({ name, actions, meta?, loader })`   | Declares a screen. See [screens](/guides/screens/).                       |
| `payload<T>()`                                     | Declares the payload type of an action.                                   |
| `defineFlow({ name, baseUrl?, steps, overlays? })` | Declares a flow; register its transitions with `flow.transitions({ … })`. |
| `goto(flow, step?)`, `goto.exit()`                 | Target in another flow (or resume it); back to the calling step.          |
| `branch(targets, resolve, { samples? })`           | Conditional target among declared ones.                                   |
| `effect(run)`                                      | Side effect without navigation.                                           |
| `createFlowApp(flows, { integrations? })`          | Composes the flows; `integrations` receive the events of every instance.  |

### Engine

`createFlowEngine(app, { initial?, deferStartEvents? })` returns:

| Member                                 | Description                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `getSnapshot()`                        | `{ flow, step, history, callers, params }`.                                  |
| `subscribe(cb)`                        | Called on every state change (used by `useSyncExternalStore`).               |
| `on(type \| '*', cb)`                  | Subscribes to events; returns the unsubscribe function.                      |
| `dispatch(action, payload?, options?)` | Runs the transition of the action on the current step.                       |
| `back()`                               | Back to the previous step, or `back:empty`.                                  |
| `start(flow, step?, options?)`         | Starts or resumes a flow: `{ clearHistory?, history?, params? }`.            |
| `clearHistory()`                       | Clears the history.                                                          |
| `urlOf({ flow, step }, params?)`       | The URL of a step.                                                           |
| `coverage()`                           | `{ ratio, covered, missing }`: transitions walked by this instance.          |
| `releaseStartEvents()`                 | Emits the start events held with `deferStartEvents` (the Provider calls it). |

### Graph and URLs

| Export                         | Description                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| `toGraph(app)`                 | `{ nodes, edges }` of every flow, without running any resolver. |
| `toMermaid(graph, direction?)` | Mermaid diagram of the graph.                                   |
| `validateFlows(app)`           | Issues with `code`, `severity`, `where` and `message`.          |
| `matchUrl(app, path)`          | Resolves a URL to a step (deep link rules).                     |
| `buildUrl`, `urlPattern`       | URL of a step, with or without params.                          |

### Adapters

| Export                                           | Description                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `browserHistory({ mode?, basename?, browser? })` | URL, browser back/forward, deep links. See [URLs](/guides/urls/). |
| `scrollRestoration({ get?, set? })`              | Restores the scroll position on back.                             |
| `FlowAdapter`                                    | The adapter interface: `initial?`, `attach`, `screenReady?`.      |

### Types

`Register`, `RegisteredApp`, `RegisteredFlows`, `RegisteredFlowName`, `RegisteredEvent`, `FlowEvent` and one named type per event
(`FlowStartEvent`, `StepEnterEvent`, `StepLeaveEvent`, `FlowExitEvent`, `BackEmptyEvent`, `ActionEvent`, `ActionUnhandledEvent`),
`ScreenActions`, `ActionPayloads`, `StepParams`, `ParamsOf`, `FlowSnapshot`, `FlowEngine`, `FlowApp`, `FlowDef`, `ScreenDef`,
`StepOptions`, `HistoryEntry`, `GraphNode`, `GraphEdge`, `FlowGraph`, `FlowIssue`.

## `react-flow-app/react`

| Export                          | Description                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `FlowProvider`                  | `app`, `initial`, `adapters`, `fallback`, `children`. See [React](/guides/react/). |
| `useFlow(screen)`               | `dispatch`, `back`, `canGoBack`.                                                   |
| `useStepParams(flow, step)`     | Typed URL params of a step.                                                        |
| `useFlowEvents(type, callback)` | Typed events.                                                                      |
| `useFlowSelector(selector)`     | A value derived from the snapshot.                                                 |
| `useFlowEngine()`               | The Provider's engine.                                                             |

## `react-flow-app/analytics`

| Export                                    | Description                                          |
| ----------------------------------------- | ---------------------------------------------------- |
| `segment({ client?, origin?, …options })` | Segment (analytics.js).                              |
| `ga4({ gtag?, origin?, …options })`       | Google Analytics 4 (gtag.js).                        |
| `analytics(sink, options?)`               | Any tool: `sink` has `page(view)` and `track(call)`. |

Options: `actions`, `page`, `flows`, `enabled`. See [analytics](/guides/analytics/).

## `react-flow-app/testing`

| Export                                              | Description                                                   |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `getPaths(app, from)`                               | Shortest path to every reachable step, with sample payloads.  |
| `check(app, { committed?, base?, strict? })`        | What the CLI runs: validation, snapshot, stale check, report. |
| `toSnapshot(graph)`                                 | Stable snapshot of the graph (for `flows.graph.json`).        |
| `diffGraphs(before, after)`                         | Added, removed and changed steps and transitions.             |
| `toMermaidDiff(before, after)`, `diffToMarkdown(…)` | Highlighted diagram and markdown summary of a diff.           |

## CLI

`react-flow-app check` — see [testing and the check CLI](/guides/testing/#react-flow-app-check).
