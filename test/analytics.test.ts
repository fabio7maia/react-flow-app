import assert from 'node:assert/strict';
import { createFlowEngine, type FlowAdapter } from 'react-flow-app';
import { analytics, ga4, segment } from 'react-flow-app/analytics';
import { describe, it, vi } from 'vitest';
import { flowApp } from '../examples/store/app.flow';

const run = (adapter: FlowAdapter, initial: { flow: 'home' | 'checkout' } = { flow: 'home' }) => {
	const engine = createFlowEngine(flowApp, { initial, deferStartEvents: true });
	adapter.attach(engine as never);
	engine.releaseStartEvents();
	return engine;
};

describe('analytics: GA4', () => {
	it('page_view with the meta title, an absolute location and the previous step as referrer', () => {
		const calls: unknown[][] = [];
		const engine = run(
			ga4({
				gtag:
					() =>
					(...args) =>
						calls.push(args),
				origin: 'https://store.example',
			})
		);

		engine.dispatch('openCart');

		assert.deepEqual(calls, [
			['event', 'flow_start', { flow: 'home', step: 'dashboard', source: 'initial' }],
			[
				'event',
				'page_view',
				{
					page_title: 'Home',
					page_location: 'https://store.example/dashboard',
					page_referrer: undefined,
					flow: 'home',
					step: 'dashboard',
				},
			],
			['event', 'flow_exit', { flow: 'home', step: 'dashboard', reason: 'goto' }],
			['event', 'flow_start', { flow: 'checkout', step: 'cart', source: 'goto' }],
			[
				'event',
				'page_view',
				{
					page_title: 'Cart',
					page_location: 'https://store.example/checkout/cart',
					page_referrer: 'https://store.example/dashboard',
					flow: 'checkout',
					step: 'cart',
				},
			],
		]);
	});

	it('does not fail without gtag loaded (e.g. the snippet blocked by an ad blocker)', () => {
		const engine = run(ga4({ gtag: () => undefined }));
		engine.dispatch('openCart');
		assert.equal(engine.getSnapshot().step, 'cart');
	});
});

describe('analytics: Segment', () => {
	it('page(name, props) and flow events with the "Object Action" convention', () => {
		const calls: string[] = [];
		const client = {
			page: (name: string, props?: Record<string, unknown>) => calls.push(`page ${name} ${props?.path} ${props?.referrer}`),
			track: (name: string, props?: Record<string, unknown>) => calls.push(`track ${name} ${JSON.stringify(props)}`),
		};
		const engine = run(segment({ client: () => client, origin: 'https://store.example', flows: false }), { flow: 'checkout' });

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		engine.back();

		assert.deepEqual(calls, [
			'page Cart /checkout/cart undefined',
			'page Payment /checkout/pay/42 https://store.example/checkout/cart',
			'page Cart /checkout/cart https://store.example/checkout/pay/42',
		]);
	});

	it('flow events are named "Flow Started" / "Flow Exited"', () => {
		const names: string[] = [];
		const engine = run(segment({ client: () => ({ page: () => undefined, track: name => names.push(name) }) }));

		engine.dispatch('openCart');

		assert.deepEqual(names, ['Flow Started', 'Flow Exited', 'Flow Started']);
	});
});

describe('analytics: mapping', () => {
	const sinkFor = () => {
		const calls: string[] = [];
		return {
			calls,
			sink: {
				page: (view: { title: string; path: string; properties?: object }) =>
					calls.push(`page ${view.title} ${view.path}${view.properties ? ` ${JSON.stringify(view.properties)}` : ''}`),
				track: (call: { name: string; properties?: object }) =>
					calls.push(`track ${call.name}${call.properties ? ` ${JSON.stringify(call.properties)}` : ''}`),
			},
		};
	};

	it('actions are opt-in: only listed ones are sent, with what the mapping picks from the payload', () => {
		const { calls, sink } = sinkFor();
		const engine = run(
			analytics(sink, {
				flows: false,
				page: false,
				actions: {
					checkout: payload => ({ name: 'checkout', properties: { loggedIn: payload.loggedIn } }),
					// Returning false skips this one (e.g. only failed payments matter).
					pay: payload => (payload.ok ? false : { name: 'payment_failed' }),
				},
			}),
			{ flow: 'checkout' }
		);

		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('cancel'); // not listed
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: false });
		engine.dispatch('retry');
		engine.dispatch('pay', { ok: true });

		assert.deepEqual(calls, ['track checkout {"loggedIn":true}', 'track checkout {"loggedIn":true}', 'track payment_failed']);
	});

	it('the action mapping receives where the action happened', () => {
		const contexts: unknown[] = [];
		const engine = run(
			analytics(
				{ page: () => undefined, track: () => undefined },
				{ actions: { checkout: (_payload, context) => (contexts.push(context), false) } }
			),
			{ flow: 'checkout' }
		);

		engine.dispatch('checkout', { loggedIn: true });

		assert.deepEqual(contexts, [{ flow: 'checkout', step: 'cart', url: '/checkout/cart', navigationId: 2, overlay: undefined }]);
	});

	it('custom page: title, properties or skipping steps', () => {
		const { calls, sink } = sinkFor();
		const engine = run(
			analytics(sink, {
				flows: false,
				page: event => (event.flow === 'auth' ? false : { properties: { funnel: event.meta?.funnel ?? 'none' } }),
			}),
			{ flow: 'checkout' }
		);

		engine.dispatch('checkout', { loggedIn: false });

		assert.deepEqual(calls, ['page Cart /checkout/cart {"funnel":"checkout"}']);
	});

	it('consent: nothing is sent while enabled() is false, and the referrer is still right afterwards', () => {
		const { calls, sink } = sinkFor();
		let consent = false;
		const seen: Array<string | undefined> = [];
		const engine = run(
			analytics({ ...sink, page: view => (sink.page(view), seen.push(view.referrer)) }, { flows: false, enabled: () => consent })
		);

		engine.dispatch('openCart');
		assert.deepEqual(calls, []);

		consent = true;
		engine.dispatch('checkout', { loggedIn: true });

		assert.deepEqual(calls, ['page Payment /checkout/pay/:orderId']);
		assert.deepEqual(seen, ['/checkout/cart']);
	});

	it('an error in the analytics SDK does not break the navigation', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const engine = run(
			analytics({
				page: () => {
					throw new Error('SDK is down');
				},
				track: () => undefined,
			})
		);

		engine.dispatch('openCart');

		assert.equal(engine.getSnapshot().step, 'cart');
		assert.ok(error.mock.calls.length > 0);
		error.mockRestore();
	});
});
