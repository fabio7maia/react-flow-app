import assert from 'node:assert/strict';
import {
	branch,
	createFlowApp,
	createFlowEngine,
	defineFlow,
	defineScreen,
	type FlowEvent,
	toGraph,
	toMermaid,
	validateFlows,
} from 'react-flow-app';
import { getPaths } from 'react-flow-app/testing';
import { describe, it, vi } from 'vitest';
import { flowApp } from '../examples/store/app.flow';
import { authFlow } from '../examples/store/flows/auth.flow';
import { checkoutFlow } from '../examples/store/flows/checkout.flow';
import { homeFlow } from '../examples/store/flows/home.flow';
import { cartScreen } from '../examples/store/screens/cart/cart.screen';
import { paymentScreen } from '../examples/store/screens/payment/payment.screen';

const record = (engine: ReturnType<typeof createFlowEngine>): string[] => {
	const events: string[] = [];
	engine.on('*', (event: FlowEvent) => {
		const detail = event.type === 'action' ? `:${event.action}` : '';
		events.push(`${event.type}${detail}@${event.flow}.${event.step}#${event.navigationId}`);
	});
	return events;
};

const at = (engine: ReturnType<typeof createFlowEngine>): string => {
	const { flow, step } = engine.getSnapshot();
	return `${flow}.${step}`;
};

describe('events', () => {
	it('emits action → step:leave → step:enter with the same navigationId', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = record(engine);

		engine.dispatch('checkout', { loggedIn: true });

		assert.deepEqual(events, ['action:checkout@checkout.cart#2', 'step:leave@checkout.cart#2', 'step:enter@checkout.payment#2']);
	});

	it('deferStartEvents holds the start events until releaseStartEvents()', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' }, deferStartEvents: true });
		assert.equal(at(engine), 'home.dashboard');
		const events = record(engine);
		assert.deepEqual(events, []);

		engine.releaseStartEvents();
		engine.releaseStartEvents();

		assert.deepEqual(events, ['flow:start@home.dashboard#1', 'step:enter@home.dashboard#1']);
	});

	it('emits action:unhandled for actions without a transition', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = record(engine);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		engine.dispatch('refund');

		assert.deepEqual(events, ['action:unhandled@checkout.cart#2']);
		assert.equal(at(engine), 'checkout.cart');
		warn.mockRestore();
	});

	it('a failing integration does not break the navigation', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const tracked: string[] = [];
		const app = createFlowApp([homeFlow, checkoutFlow, authFlow], {
			integrations: [
				() => {
					throw new Error('analytics is down');
				},
				event => tracked.push(event.type),
			],
		});
		const engine = createFlowEngine(app, { initial: { flow: 'checkout' } });

		engine.dispatch('checkout', { loggedIn: true });

		assert.equal(at(engine), 'checkout.payment');
		assert.ok(tracked.includes('step:enter'));
		assert.ok(error.mock.calls.length > 0);
		error.mockRestore();
	});
});

describe('history (v2 semantics)', () => {
	it('ignoreHistory: the step is not kept in the history when leaving it', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: false });
		assert.equal(at(engine), 'checkout.failure');

		engine.dispatch('retry');
		engine.back();

		assert.equal(at(engine), 'checkout.cart');
	});

	it('back from an ignoreHistory step returns to the previous step', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: false });

		engine.back();

		assert.equal(at(engine), 'checkout.payment');
	});

	it('clearHistory: back without history emits back:empty and does not navigate', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: true });
		const events = record(engine);

		engine.back();

		assert.equal(at(engine), 'checkout.success');
		assert.deepEqual(events, ['back:empty@checkout.success#4']);
	});

	it('without allowCyclicHistory, returning to a visited step cuts the cycle', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		for (let i = 0; i < 5; i++) {
			engine.dispatch('checkout', { loggedIn: true });
			engine.dispatch('cancel');
		}

		assert.deepEqual(engine.getSnapshot().history, []);
	});

	it('goto.exit() returns to the step that opened the flow', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = record(engine);

		engine.dispatch('checkout', { loggedIn: false });
		assert.equal(at(engine), 'auth.login');

		engine.dispatch('loggedIn');
		assert.equal(at(engine), 'checkout.cart');
		assert.deepEqual(engine.getSnapshot().callers, []);
		assert.ok(events.includes('flow:exit@auth.login#3'));
	});

	it('back crosses flows and clears the caller', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		engine.dispatch('openCart');
		assert.equal(at(engine), 'checkout.cart');

		engine.back();

		assert.equal(at(engine), 'home.dashboard');
		assert.deepEqual(engine.getSnapshot().callers, []);
	});

	it('independent instances (no singleton)', () => {
		const a = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const b = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		a.dispatch('checkout', { loggedIn: true });

		assert.equal(at(a), 'checkout.payment');
		assert.equal(at(b), 'home.dashboard');
	});
});

describe('URL params', () => {
	it('a transition without params keeps those of the last visit to the step (failure → retry → payment)', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		engine.dispatch('pay', { ok: false });

		engine.dispatch('retry');

		assert.deepEqual(engine.getSnapshot().params, { orderId: '42' });
		assert.equal(engine.urlOf({ flow: 'checkout', step: 'payment' }), '/checkout/pay/42');
	});

	it('explicit params replace those of the last visit', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		engine.dispatch('cancel');

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '7' } });

		assert.deepEqual(engine.getSnapshot().params, { orderId: '7' });
	});

	it('params are restored when going back to a step', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		engine.dispatch('cancel');
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '7' } });
		engine.dispatch('pay', { ok: false });

		engine.back();

		assert.equal(engine.urlOf({ flow: 'checkout', step: 'payment' }), '/checkout/pay/7');
		assert.deepEqual(engine.getSnapshot().params, { orderId: '7' });
	});
});

describe('diagram and validation', () => {
	it('extracts the graph of flows declared in separate files, without running resolvers', () => {
		const graph = toGraph(flowApp);

		assert.equal(graph.nodes.length, 6);
		assert.deepEqual(
			graph.edges.map(edge => `${edge.from} -${edge.action}/${edge.kind}-> ${edge.to}`),
			[
				'home.dashboard -openCart/cross-flow-> checkout.cart',
				'checkout.cart -checkout/branch-> checkout.payment',
				'checkout.cart -checkout/cross-flow-> auth.login',
				'checkout.payment -pay/branch-> checkout.success',
				'checkout.payment -pay/branch-> checkout.failure',
				'checkout.payment -cancel/direct-> checkout.cart',
				'checkout.success -finish/cross-flow-> home.dashboard',
				'checkout.failure -retry/direct-> checkout.payment',
				'auth.login -loggedIn/exit-> checkout.cart',
				'auth.login -cancel/exit-> checkout.cart',
			]
		);
	});

	it('produces stable Mermaid (diagram snapshot in the PR)', () => {
		assert.equal(
			toMermaid(toGraph(flowApp)),
			[
				'graph LR',
				'  subgraph home',
				'    home_dashboard((dashboard))',
				'  end',
				'  subgraph checkout',
				'    checkout_cart((cart))',
				'    checkout_payment[payment]',
				'    checkout_success[success]',
				'    checkout_failure[failure]',
				'  end',
				'  subgraph auth',
				'    auth_login((login))',
				'  end',
				'  home_dashboard -.->|openCart| checkout_cart',
				'  checkout_cart -->|checkout| checkout_payment',
				'  checkout_cart -.->|checkout| auth_login',
				'  checkout_payment -->|pay| checkout_success',
				'  checkout_payment -->|pay| checkout_failure',
				'  checkout_payment -->|cancel| checkout_cart',
				'  checkout_success -.->|finish| home_dashboard',
				'  checkout_failure -->|retry| checkout_payment',
				'  auth_login -.->|loggedIn ↩| checkout_cart',
				'  auth_login -.->|cancel ↩| checkout_cart',
			].join('\n')
		);
	});

	it('warns when a branch has no sample payload for a target', () => {
		const flow = defineFlow({
			name: 'nosample',
			steps: { payment: { screen: paymentScreen, initial: true }, cart: { screen: cartScreen } },
		});
		flow.transitions({
			payment: {
				pay: branch(['cart', 'payment'], (_, p) => (p.ok ? 'cart' : 'payment'), { samples: { cart: { ok: true } } }),
				cancel: 'cart',
			},
			cart: { checkout: 'payment' },
		});

		assert.deepEqual(
			validateFlows(createFlowApp([flow])).map(issue => `${issue.severity}:${issue.code}@${issue.where}`),
			['warning:branch-without-sample@nosample.payment']
		);
	});

	it('the example app is valid', () => {
		assert.deepEqual(validateFlows(flowApp), []);
	});

	it('detects actions without transitions, unreachable steps and flows without an initial step', () => {
		const broken = defineFlow({
			name: 'broken',
			steps: { cart: { screen: cartScreen }, payment: { screen: paymentScreen } },
		});
		broken.transitions({ payment: { cancel: 'cart' } });

		const issues = validateFlows(createFlowApp([broken]));

		assert.deepEqual(
			issues.map(issue => `${issue.code}@${issue.where}`),
			['no-initial-step@broken', 'unhandled-action@broken.cart', 'unhandled-action@broken.payment', 'unreachable-step@broken.payment']
		);
	});
});

describe('overlays and resuming flows', () => {
	const helpScreen = defineScreen({
		name: 'help',
		actions: ['backToCart', 'close'],
		meta: { title: 'Help' },
		loader: () => import('../examples/store/screens/success/Success'),
	});

	it('an overlay and a step cannot share a name', () => {
		assert.throws(() => defineFlow({ name: 'clash', steps: { help: { screen: cartScreen } }, overlays: { help: helpScreen } }));
	});

	it('overlays show up in the graph and in Mermaid, and are validated', () => {
		const flow = defineFlow({
			name: 'shop',
			steps: { cart: { screen: cartScreen, initial: true }, payment: { screen: paymentScreen } },
			overlays: { help: helpScreen },
		});
		flow.transitions({ cart: { checkout: 'payment' }, payment: { pay: 'cart', cancel: 'cart' }, help: { backToCart: 'cart' } });
		const app = createFlowApp([flow]);

		assert.ok(toMermaid(toGraph(app)).includes('shop__help{{@help}}'));
		assert.ok(toMermaid(toGraph(app)).includes('shop__help -->|backToCart| shop_cart'));
		assert.deepEqual(
			validateFlows(app).map(issue => `${issue.code}@${issue.where}`),
			['unhandled-action@shop.@help']
		);
	});

	it('start(flow) without a step resumes the flow at the last step it was in', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true });
		engine.start('home');
		engine.start('checkout');

		assert.equal(at(engine), 'checkout.payment');
	});
});

describe('tests generated from the graph', () => {
	// The payload of each branch comes from the `samples` declared in the branch itself (checkout.flow.ts).
	const paths = getPaths(flowApp, 'home.dashboard');

	it('produces one path per reachable step', () => {
		assert.deepEqual(paths.map(path => path.target).sort(), [
			'auth.login',
			'checkout.cart',
			'checkout.failure',
			'checkout.payment',
			'checkout.success',
		]);
	});

	for (const path of paths) {
		it(`reaches ${path.target} through ${path.steps.map(step => step.action).join(' → ')}`, () => {
			const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
			for (const step of path.steps) {
				engine.dispatch(step.action, step.payload);
			}
			assert.equal(at(engine), path.target);
		});
	}

	it('reports the transitions that no test exercised', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		for (const path of paths) {
			engine.start('home');
			for (const step of path.steps) {
				engine.dispatch(step.action, step.payload);
			}
		}

		const { ratio, missing } = engine.coverage();

		assert.deepEqual(missing, [
			'checkout.payment:cancel->cart',
			'checkout.success:finish->home.dashboard',
			'checkout.failure:retry->payment',
			'auth.login:loggedIn->exit',
			'auth.login:cancel->exit',
		]);
		assert.equal(ratio, 0.5);
	});
});
