import { createFlowEngine } from 'react-flow-app';
import { getPaths } from 'react-flow-app/testing';
import { expect, test } from 'vitest';
import { flowApp } from '../../examples/store/app.flow';

test('a failed payment can be retried', () => {
	const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
	engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
	engine.dispatch('pay', { ok: false });
	engine.dispatch('retry');

	expect(engine.getSnapshot().step).toBe('payment');
});

// One test per reachable step, from the graph. Add hand-written tests for what `coverage()` reports as missing.
for (const path of getPaths(flowApp, 'home.dashboard')) {
	test(`reaches ${path.target}`, () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		for (const step of path.steps) engine.dispatch(step.action, step.payload);
		const { flow, step } = engine.getSnapshot();
		expect(`${flow}.${step}`).toBe(path.target);
	});
}
