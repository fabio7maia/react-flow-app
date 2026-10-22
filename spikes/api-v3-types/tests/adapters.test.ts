import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
import { flowApp } from '../example/app.flow';
import { createFakeBrowser, settle } from './fake-browser';

/** Liga o adaptador como o FlowProvider: deep link primeiro, depois attach. */
const setup = (adapter: FlowAdapter, fallback: { flow: 'home' | 'checkout' | 'auth' }) => {
	const initial = adapter.initial?.(flowApp) ?? fallback;
	const engine = createFlowEngine(flowApp, { initial: initial as never });
	const detach = adapter.attach(engine as never);
	const at = (): string => `${engine.getSnapshot().flow}.${engine.getSnapshot().step}`;
	return { engine, detach, at };
};

describe('URL nos eventos', () => {
	it('os eventos levam o URL do passo, com parâmetros', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const urls: string[] = [];
		engine.on('*', (event: FlowEvent) => urls.push(`${event.type} ${event.url}`));

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });

		assert.deepEqual(urls, [
			'action /checkout/cart',
			'step:leave /checkout/cart',
			'step:enter /checkout/pay/42',
		]);
	});

	it('os parâmetros são repostos ao voltar a um passo', () => {
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

describe('parâmetros ao voltar a um passo por uma transição', () => {
	it('uma transição sem params mantém os da última visita ao passo (failure → retry → payment)', () => {
		// Apanhado pela demo: o URL ficava /checkout/pay/:orderId depois de "Tentar novamente".
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		engine.dispatch('pay', { ok: false });

		engine.dispatch('retry');

		assert.deepEqual(engine.getSnapshot().params, { orderId: '42' });
		assert.equal(engine.urlOf({ flow: 'checkout', step: 'payment' }), '/checkout/pay/42');
	});

	it('params explícitos substituem os da última visita', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		engine.dispatch('cancel');

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '7' } });

		assert.deepEqual(engine.getSnapshot().params, { orderId: '7' });
	});
});

describe('deep links', () => {
	it('um passo entrypoint abre diretamente', () => {
		assert.deepEqual(matchUrl(flowApp, '/auth/login'), { flow: 'auth', step: 'login', params: {}, redirected: false });
	});

	it('um passo que não é entrypoint redireciona para o passo inicial do flow', () => {
		assert.deepEqual(matchUrl(flowApp, '/checkout/pay/42'), {
			flow: 'checkout',
			step: 'cart',
			params: {},
			redirected: true,
		});
	});

	it('extrai parâmetros do URL', () => {
		const order = defineScreen({ name: 'order', actions: ['close'], meta: { title: 'Pedido' }, loader: () => import('../example/screens/success/Success') });
		const orders = defineFlow({ name: 'orders', baseUrl: 'orders', steps: { detail: { screen: order, url: ':id', entrypoint: true } } });
		assert.deepEqual(matchUrl(createFlowApp([orders]), '/orders/A%2F7?x=1'), {
			flow: 'orders',
			step: 'detail',
			params: { id: 'A/7' },
			redirected: false,
		});
	});

	it('URL desconhecido não resolve (usa o passo inicial do Provider)', () => {
		assert.equal(matchUrl(flowApp, '/nada'), undefined);
	});

	it('o adaptador abre a app no passo do deep link', () => {
		const fake = createFakeBrowser({ hash: '#/auth/login' });
		const { at } = setup(browserHistory({ browser: fake.browser }), { flow: 'home' });
		assert.equal(at(), 'auth.login');
	});
});

describe('browserHistory', () => {
	it('avançar faz push; o back do browser recua no flow', async () => {
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

	it('back pela UI recua também o browser (pilhas alinhadas)', async () => {
		const fake = createFakeBrowser();
		const { engine } = setup(browserHistory({ browser: fake.browser }), { flow: 'checkout' });
		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		assert.equal(fake.position(), 1);

		engine.back();
		await settle();

		assert.equal(fake.position(), 0);
		assert.equal(fake.url(), '/#/checkout/cart');
	});

	it('sair de um passo ignoreHistory substitui a entrada (o back do browser não volta a ele)', async () => {
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

	it('depois de clearHistory, o back do browser sai da app em vez de voltar ao pagamento', async () => {
		const fake = createFakeBrowser();
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'checkout' });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: true });
		assert.equal(at(), 'checkout.success');

		await fake.back();

		assert.equal(at(), 'checkout.success');
		assert.equal(fake.hasLeft(), true);
	});

	it('app aberta num separador novo (sem página anterior): o back fica no passo atual e repõe o URL', async () => {
		// Apanhado pelo e2e em Firefox: o go() para fora da app é ignorado e o URL ficava no carrinho.
		const fake = createFakeBrowser({ previousPages: 0 });
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'checkout' });
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: true });

		await fake.back();

		assert.equal(at(), 'checkout.success');
		assert.equal(fake.hasLeft(), false);
		assert.equal(fake.url(), '/#/checkout/success');
	});

	it('o forward do browser não navega e repõe o URL do passo atual', async () => {
		const fake = createFakeBrowser();
		const { engine, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'home' });
		engine.dispatch('openCart');
		await fake.back();

		await fake.forward();

		assert.equal(at(), 'home.dashboard');
		assert.equal(fake.url(), '/#/dashboard');
	});

	it('modo path com basename', () => {
		const fake = createFakeBrowser({ pathname: '/app/checkout/cart' });
		const { engine, at } = setup(browserHistory({ mode: 'path', basename: '/app', browser: fake.browser }), {
			flow: 'home',
		});
		assert.equal(at(), 'checkout.cart');

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '9' } });

		assert.equal(fake.url(), '/app/checkout/pay/9');
	});

	it('detach remove o listener de popstate', async () => {
		const fake = createFakeBrowser();
		const { engine, detach, at } = setup(browserHistory({ browser: fake.browser }), { flow: 'home' });
		engine.dispatch('openCart');
		detach();

		await fake.back();

		assert.equal(at(), 'checkout.cart');
	});
});

describe('scrollRestoration', () => {
	it('ao voltar repõe a posição do passo; ao avançar sobe ao topo — só quando o ecrã está pronto', () => {
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
