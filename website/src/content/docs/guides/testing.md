---
title: Testing and the check CLI
description: Test flows without React, generate tests from the graph, and keep the diagram in the repo.
---

:::note[v2 equivalent]
v2 had no way to test a flow without rendering the Provider.
:::

## Test the engine directly

The engine runs in plain Node: no DOM, no rendering.

```ts
import { createFlowEngine } from 'react-flow-app';
import { flowApp } from './app.flow';

test('a failed payment can be retried', () => {
	const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
	engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
	engine.dispatch('pay', { ok: false });
	engine.dispatch('retry');

	expect(engine.getSnapshot().step).toBe('payment');
	expect(engine.urlOf({ flow: 'checkout', step: 'payment' })).toBe('/checkout/pay/42');
});
```

## Generated tests

`getPaths` returns the shortest path from a step to every reachable step, with the sample payloads of each `branch`:

```ts
import { createFlowEngine } from 'react-flow-app';
import { getPaths } from 'react-flow-app/testing';

for (const path of getPaths(flowApp, 'home.dashboard')) {
	test(`reaches ${path.target}`, () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		for (const step of path.steps) engine.dispatch(step.action, step.payload);
		const { flow, step } = engine.getSnapshot();
		expect(`${flow}.${step}`).toBe(path.target);
	});
}
```

`engine.coverage()` returns `{ ratio, covered, missing }`: the transitions that no test walked, so you know what to write by hand.

### What generated tests cover today

They test the **navigation map**, not the screens: each path runs on the headless engine and checks that every action leads where the
flows declare, across flows, and that each `branch` resolver picks the right target for its samples.

They do **not** cover yet:

- **Every transition**: one path per reachable step means transitions off the shortest paths are not walked. In the example store,
  generated paths cover 5 of 10 transitions; `coverage().missing` lists the rest.
- **Back**: only forward navigation is generated.
- **Overlays**: their transitions are never walked, since nothing navigates into an overlay.
- **Several payloads per branch target**, or **URL params**: one sample per target, and no `params`.
- **Effects** run for real, so mock them if they call out.
- **The UI**: whether a button dispatches the right action, rendering and the browser. Use component and e2e tests for that.

:::note[Planned]
Before the beta: one generated path per transition (100% of transitions, overlays and `goto.exit()` included), back snapshots,
several samples per target, URL params, `effects: false` for tests, a `describeFlows(app, { describe, it, expect })` runner that turns
all of this into tests in one line, and a screen harness for component tests. The design is in
[RFC 04](https://github.com/fabio7maia/react-flow-app/blob/v3/rfcs/api-v3/04-testes-gerados.md).
:::

## Validation

```ts
import { validateFlows } from 'react-flow-app';

expect(validateFlows(flowApp).filter(issue => issue.severity === 'error')).toEqual([]);
```

| Issue                   | Severity | Meaning                                                 |
| ----------------------- | -------- | ------------------------------------------------------- |
| `no-initial-step`       | error    | A flow does not mark any step as `initial`.             |
| `unhandled-action`      | error    | A screen action without a transition on that step.      |
| `unknown-action`        | error    | A transition for an action the screen does not declare. |
| `unknown-target`        | error    | A transition to a step that does not exist.             |
| `unreachable-step`      | error    | A step no initial step or entrypoint leads to.          |
| `exit-without-caller`   | error    | `goto.exit()` in a flow no other flow opens.            |
| `branch-without-sample` | warning  | A branch target without a sample payload.               |

## react-flow-app check

The CLI loads your app from TypeScript (path aliases from your `tsconfig` included), validates it, and keeps two files in the repo:
`flows.graph.json` (a stable snapshot of the graph) and `FLOWS.md` (a Mermaid diagram GitHub renders).

```bash
npx react-flow-app check --app src/app.flow.ts --write   # create or update the snapshot and the diagram
npx react-flow-app check --app src/app.flow.ts           # CI: fails on errors or a stale snapshot
npx react-flow-app check --base origin/main --report flows-report.md
```

| Flag                | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `--app <file>`      | The file that exports the app (default `src/app.flow.ts`).                |
| `--export <name>`   | The export name (default: the first export created with `createFlowApp`). |
| `--snapshot <file>` | Graph snapshot (default `flows.graph.json`).                              |
| `--diagram <file>`  | Mermaid diagram (default `FLOWS.md`).                                     |
| `--write`           | Update both files.                                                        |
| `--base <ref>`      | Compare with the snapshot of a git ref and print a summary.               |
| `--report <file>`   | Write that summary to a file, for a PR comment or the job summary.        |
| `--strict`          | Warnings fail too.                                                        |

Because the snapshot is committed, every PR that changes navigation shows it in the diff. With `--base`, the summary lists new,
removed and changed steps and transitions, with a diagram where the changes are highlighted. A GitHub Actions step:

```yaml
- run: npx react-flow-app check --base origin/${{ github.base_ref }} --report flows-report.md
- if: always()
  run: cat flows-report.md >> "$GITHUB_STEP_SUMMARY"
```
