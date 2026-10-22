import assert from 'node:assert/strict';
import {
	browserHistory,
	createFlowApp,
	createFlowEngine,
	defineFlow,
	defineScreen,
	type FlowAdapter,
	type FlowEvent,
	matchUrl,
	scrollRestoration,
} from 'react-flow-app';
import { describe, it } from 'vitest';
import { flowApp } from '../examples/store/app.flow';
import { createFakeBrowser, settle } from './helpers/fake-browser';

/** Attaches the adapter the way FlowProvider does: deep link first, then attach. */
const setup = (adapter: FlowAdapter, fallback: { flow: 'home' | 'checkout' | 'auth' }) => {
	const initial = adapter.initial?.(flowApp) ?? fallback;
	const engine = createFlowEngine(flowApp, { initial: initial as never });
	const detach = adapter.attach(engine as never);
	const at = (): string => `${engine.getSnapshot().flow}.${engine.getSnapshot().step}`;
	return { engine, detach, at };
};

describe('URL in events', () => {
	it('events carry the URL of the step, with params', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const urls: string[] = [];
		engine.on('*', (event: FlowEvent) => urls.push(`${event.type} ${event.url}`));

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });

		assert.deepEqual(urls, ['action /checkout/cart', 'step:leave /checkout/cart', 'step:enter /checkout/pay/42']);
	});
});

describe('deep links', () => {
	it('an entrypoint step opens directly', () => {
		assert.deepEqual(matchUrl(flowApp, '/auth/login'), { flow: 'auth', step: 'login', params: {}, redirected: false });
	});

	it('a step that is not an entrypoint redirects to the initial step of its flow', () => {
		assert.deepEqual(matchUrl(flowApp, '/checkout/pay/42'), {
			flow: 'checkout',
			step: 'cart',
			params: {},
			redirected: true,
		});
	});

	it('extracts URL params', () => {
		const order = defineScreen({
			name: 'order',
			actions: ['close'],
			meta: { title: 'Order' },
			loader: () => import('../examples/store/screens/success/Success'),
		});
		const orders = defineFlow({
			name: 'orders',
			baseUrl: 'orders',
			steps: { detail: { screen: order, url: ':id', entrypoint: true } },
		});
		assert.deepEqual(matchUrl(createFlowApp([orders]), '/orders/A%2F7?x=1'), {
			flow: 'orders',
			step: 'detail',
			params: { id: 'A/7' },
			redirected: false,
		});
	});

	it('an unknown URL does not resolve (the Provider uses its initial step)', () => {
		assert.equal(matchUrl(flowApp, '/nothing'), undefined);
	});

	it('the adapter opens the app at the deep link step', () => {
		const fake = createFakeBrowser({ hash: '#/auth/login' });
		const { at } = setup(browserHistory({ browser: fake.browser }), { flow: 'home' });
		assert.equal(at(), 'auth.login');
	});
});

describe('browserHistory', () => {
	it('moving forward pushes; the browser back button goes back in the flow', async () => {
		const fake = createFakeBrowser();
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'home' });
		assert.equal(fake.url(), '/#/dashboard');

		engine.dispatch('openCart');
		assert.equal(fake.url(), '/#/checkout/cart');
		assert.equal(fake.size(), 2);

		await fake.back();

		assert.equal(at(), 'home.dashboard');
		assert.equal(fake.url(), '/#/dashboard');
	});

	it('back from the UI also moves the browser back (aligned stacks)', async () => {
		const fake = createFakeBrowser();
		const { engine } = setup(browserHistory({ browser: fake.browser }), { flow: 'checkout' });
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		assert.equal(fake.position(), 1);

		engine.back();
		await settle();

		assert.equal(fake.position(), 0);
		assert.equal(fake.url(), '/#/checkout/cart');
	});

	it('leaving an ignoreHistory step replaces the entry (browser back does not return to it)', async () => {
		const fake = createFakeBrowser();
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'checkout' });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: false });
		engine.dispatch('retry');
		assert.equal(at(), 'checkout.payment');

		await fake.back();

		assert.equal(at(), 'checkout.cart');
		assert.equal(fake.url(), '/#/checkout/cart');
	});

	it('after clearHistory, browser back leaves the app instead of returning to payment', async () => {
		const fake = createFakeBrowser();
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'checkout' });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: true });
		assert.equal(at(), 'checkout.success');

		await fake.back();

		assert.equal(at(), 'checkout.success');
		assert.equal(fake.hasLeft(), true);
	});

	it('app opened in a new tab (no previous page): back stays on the current step and restores the URL', async () => {
		// Caught by the Firefox e2e: the go() out of the app is ignored and the URL stayed on the cart.
		const fake = createFakeBrowser({ previousPages: 0 });
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'checkout' });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: true });

		await fake.back();

		assert.equal(at(), 'checkout.success');
		assert.equal(fake.hasLeft(), false);
		assert.equal(fake.url(), '/#/checkout/success');
	});

	it('browser forward does not navigate and restores the URL of the current step', async () => {
		const fake = createFakeBrowser();
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'home' });
		engine.dispatch('openCart');
		await fake.back();

		await fake.forward();

		assert.equal(at(), 'home.dashboard');
		assert.equal(fake.url(), '/#/dashboard');
	});

	it('path mode with basename', () => {
		const fake = createFakeBrowser({ pathname: '/app/checkout/cart' });
		const { engine, at } = setup(browserHistory({ mode: 'path', basename: '/app', browser: fake.browser }), {
			flow: 'home',
		});
		assert.equal(at(), 'checkout.cart');

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '9' } });

		assert.equal(fake.url(), '/app/checkout/pay/9');
	});

	it('detach removes the popstate listener', async () => {
		const fake = createFakeBrowser();
		const { engine, detach, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'home' });
		engine.dispatch('openCart');
		detach();

		await fake.back();

		assert.equal(at(), 'checkout.cart');
	});
});

describe('scrollRestoration', () => {
	it('going back restores the step position; moving forward scrolls to the top — only once the screen is ready', () => {
		let scroll = 0;
		const writes: number[] = [];
		const adapter = scrollRestoration({ get: () => scroll, set: top => writes.push((scroll = top)) });
		const { engine } = setup(adapter, { flow: 'checkout' });

		scroll = 640;
		engine.dispatch('checkout', { loggedIn: true });
		assert.deepEqual(writes, []);
		adapter.screenReady?.();
		assert.deepEqual(writes, [0]);

		engine.back();
		adapter.screenReady?.();
		assert.deepEqual(writes, [0, 640]);
	});
});
