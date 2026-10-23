---
title: Installation
description: Install react-flow-app v3 and know what each entry point contains.
---

```bash
npm install react-flow-app@alpha
# or
yarn add react-flow-app@alpha
```

v3 needs React 18 or 19 and Node 18 or later for the CLI. The package ships ESM and CommonJS builds with types for both.

## Entry points

| Import                     | What it contains                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `react-flow-app`           | Screens, flows and transitions, the app, the headless engine, URL helpers, the graph and validation, browser adapters |
| `react-flow-app/react`     | `FlowProvider` and the hooks (a client entry: it carries `'use client'` for the Next.js App Router)                   |
| `react-flow-app/analytics` | GA4 and Segment adapters on top of the event contract                                                                 |
| `react-flow-app/testing`   | Generated paths, graph snapshot and diff                                                                              |
| `react-flow-app` (bin)     | `react-flow-app check`: validation, diagram and diff against a base branch                                            |

The core does not depend on React, so flows can be defined, validated and tested in plain Node.

## Recommended layout

```
src/
  screens/
    payment/
      payment.screen.ts   # defineScreen: actions, payloads, meta, loader
      Payment.tsx         # the component (lazy loaded)
  flows/
    checkout.flow.ts      # defineFlow + transitions
  app.flow.ts             # createFlowApp + Register
```

One file per screen and one per flow keeps the navigation reviewable: a PR that changes where an action goes touches only the flow
file. Next: the [quick start](/getting-started/quick-start/).
