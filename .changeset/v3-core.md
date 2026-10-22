---
'react-flow-app': major
---

v3: a new API built from the approach A RFC (`rfcs/api-v3`).

- Screens, flows and transitions declared as data, each screen and flow in its own file, typed end to end through `Register` (`goto`, payloads, URL params, metadata, events).
- A headless engine (`createFlowEngine`) with the v2 history semantics (`ignoreHistory`, `clearHistory`, `allowCyclicHistory`, resuming flows, overlays) and a public event contract (v1).
- `react-flow-app/react`: `FlowProvider`, `useFlow`, `useStepParams`, `useFlowEvents`, `useFlowSelector`, `useFlowEngine`.
- Adapters: `browserHistory` (URL, browser back/forward, deep links) and `scrollRestoration`.
- `react-flow-app/analytics`: GA4 and Segment adapters with opt-in, typed actions and consent.
- `react-flow-app/testing` and the `react-flow-app check` CLI: generated paths, transition coverage, graph snapshot, Mermaid diagram and diff against the base branch.

See the migration guide in `MIGRATION.md`.
