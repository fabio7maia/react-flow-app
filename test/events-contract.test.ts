import assert from 'node:assert/strict';
import { createFlowEngine, type FlowEvent } from 'react-flow-app';
import { describe, it, vi } from 'vitest';
import { flowApp } from '../examples/store/app.flow';

/**
 * Event contract (v1). These tests pin names, fields and order: any change shows up here as a
 * diff and is a contract change for integrators (analytics, logging). Only `timestamp` is left out,
 * because it is not deterministic.
 */
const trace = (engine: ReturnType<typeof createFlowEngine>): Array<Record<string, unknown>> => {
	const events: Array<Record<string, unknown>> = [];
	engine.on('*', (event: FlowEvent) => {
		const { timestamp, ...rest } = event;
		assert.equal(typeof timestamp, 'number');
		// JSON drops `undefined` fields (e.g. `from` at start, `overlay` outside overlays).
		events.push(JSON.parse(JSON.stringify(rest)));
	});
	return events;
};

const cart = { flow: 'checkout', step: 'cart' };
const cartMeta = { title: 'Cart', funnel: 'checkout' };

describe('event contract v1', () => {
	it('start: flow:start → step:enter', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' }, deferStartEvents: true });
		const events = trace(engine);
		engine.releaseStartEvents();

		assert.deepEqual(events, [
			{ type: 'flow:start', ...cart, source: 'initial', navigationId: 1, url: '/checkout/cart' },
			{ type: 'step:enter', ...cart, direction: 'forward', meta: cartMeta, navigationId: 1, url: '/checkout/cart' },
		]);
	});

	it('start on a step with params: flow:start already carries the URL with the params', () => {
		const engine = createFlowEngine(flowApp, {
			initial: { flow: 'checkout', step: 'payment', params: { orderId: '42' } },
			deferStartEvents: true,
		});
		const events = trace(engine);
		engine.releaseStartEvents();

		assert.deepEqual(
			events.map(event => `${event.type} ${event.url}`),
			['flow:start /checkout/pay/42', 'step:enter /checkout/pay/42']
		);
	});

	it('dispatch within a flow: action → step:leave → step:enter', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = trace(engine);

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });

		const nav = { navigationId: 2 };
		assert.deepEqual(events, [
			{ type: 'action', ...cart, action: 'checkout', payload: { loggedIn: true }, ...nav, url: '/checkout/cart' },
			{ type: 'step:leave', ...cart, reason: 'dispatch', ...nav, url: '/checkout/cart' },
			{
				type: 'step:enter',
				flow: 'checkout',
				step: 'payment',
				direction: 'forward',
				from: cart,
				meta: { title: 'Payment', funnel: 'checkout' },
				...nav,
				url: '/checkout/pay/42',
			},
		]);
	});

	it('goto to another flow: action → step:leave → flow:exit → flow:start → step:enter', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = trace(engine);

		engine.dispatch('checkout', { loggedIn: false });

		const login = { flow: 'auth', step: 'login' };
		const nav = { navigationId: 2 };
		assert.deepEqual(events, [
			{ type: 'action', ...cart, action: 'checkout', payload: { loggedIn: false }, ...nav, url: '/checkout/cart' },
			{ type: 'step:leave', ...cart, reason: 'dispatch', ...nav, url: '/checkout/cart' },
			{ type: 'flow:exit', ...cart, reason: 'goto', ...nav, url: '/checkout/cart' },
			{ type: 'flow:start', ...login, source: 'goto', ...nav, url: '/auth/login' },
			{ type: 'step:enter', ...login, direction: 'forward', from: cart, meta: { title: 'Log in' }, ...nav, url: '/auth/login' },
		]);
	});

	it('goto.exit(): the flow exits and the calling flow resumes at the step that opened it, direction back', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: false });
		const events = trace(engine);

		engine.dispatch('loggedIn');

		assert.deepEqual(
			events.map(event =>
				`${event.type} ${event.flow}.${event.step} ${event.reason ?? event.source ?? event.direction ?? ''}`.trim()
			),
			[
				'action auth.login',
				'step:leave auth.login exit',
				'flow:exit auth.login exit',
				'flow:start checkout.cart back',
				'step:enter checkout.cart back',
			]
		);
	});

	it('back across flows: step:leave → flow:exit → flow:start → step:enter, all with reason/source back', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		engine.dispatch('openCart');
		const events = trace(engine);

		engine.back();

		const dashboard = { flow: 'home', step: 'dashboard' };
		const nav = { navigationId: 3 };
		assert.deepEqual(events, [
			{ type: 'step:leave', ...cart, reason: 'back', ...nav, url: '/checkout/cart' },
			{ type: 'flow:exit', ...cart, reason: 'back', ...nav, url: '/checkout/cart' },
			{ type: 'flow:start', ...dashboard, source: 'back', ...nav, url: '/dashboard' },
			{ type: 'step:enter', ...dashboard, direction: 'back', from: cart, meta: { title: 'Home' }, ...nav, url: '/dashboard' },
		]);
	});

	it('back without history: only back:empty; an action without a transition: only action:unhandled', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = trace(engine);

		engine.back();
		engine.dispatch('refund');

		assert.deepEqual(events, [
			{ type: 'back:empty', ...cart, navigationId: 2, url: '/checkout/cart' },
			{ type: 'action:unhandled', ...cart, action: 'refund', navigationId: 3, url: '/checkout/cart' },
		]);
		warn.mockRestore();
	});

	it('run-to-completion: a navigation requested in a listener only runs after the current one ends', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const seen: string[] = [];
		engine.on('*', event => seen.push(`${event.type}@${event.step}#${event.navigationId}`));
		// E.g. a guard that sends the user back to the cart as soon as they reach payment.
		engine.on('step:enter', event => {
			if (event.step === 'payment') {
				engine.dispatch('cancel');
				seen.push(`(still on ${engine.getSnapshot().step})`);
			}
		});

		engine.dispatch('checkout', { loggedIn: true });

		assert.deepEqual(seen, [
			'action@cart#2',
			'step:leave@cart#2',
			// Delivery order: listeners of the type, then '*', then app integrations.
			'(still on payment)',
			'step:enter@payment#2',
			'action@payment#3',
			'step:leave@payment#3',
			'step:enter@cart#3',
		]);
		assert.equal(engine.getSnapshot().step, 'cart');
	});

	it('navigationId is shared by the events of one navigation and strictly increases between navigations', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		const ids: number[] = [];
		engine.on('*', event => ids.push(event.navigationId));

		engine.dispatch('openCart');
		engine.dispatch('checkout', { loggedIn: false });
		engine.dispatch('cancel');
		engine.back();

		const groups = [...new Set(ids)];
		assert.deepEqual(
			groups,
			[...groups].sort((a, b) => a - b)
		);
		assert.equal(groups.length, 4);
	});
});
