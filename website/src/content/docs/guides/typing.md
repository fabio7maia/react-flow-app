---
title: Typing
description: What Register types, and how it stays fast in large apps.
---

Declare your app once:

```ts
declare module 'react-flow-app' {
	interface Register {
		app: typeof flowApp;
		meta: { title: string; funnel?: 'checkout' | 'onboarding' };
	}
}
```

## What it types

- **`goto(flow, step)`**: flow names, then only the steps of that flow. Flows never import each other, yet a typo does not compile.
- **Transitions**: only steps of the flow as keys and local targets, only actions of the step's screen.
- **`branch`**: the payload of the action inside the resolver; only declared targets as results; sample keys and shapes.
- **`dispatch`**: actions of the screen; payload required, optional or forbidden as declared.
- **URL params**: `start`, `urlOf` and `useStepParams` know each step's params from its pattern.
- **Screen `meta`**: every screen must match `Register['meta']`; events expose it typed.
- **Events and analytics**: every action name and its payload, across all flows.

`useFlow(screen)` does not need `Register`: it is typed from the screen definition alone.

## In large apps

The types are designed for type-check speed: a single lookup per `goto`, and one event member per action (not per flow × step ×
action). A generated app with 1000 screens type-checks in about 4 to 5 seconds on a laptop, growing roughly linearly. The repository measures it with
`yarn bench`.

## Without Register

Everything still works without it, with looser types: flow and step names become `string`, and event payloads lose their types.
