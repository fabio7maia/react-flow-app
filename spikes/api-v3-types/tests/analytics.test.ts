import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { analytics, createFlowEngine, type FlowAdapter, ga4, segment } from 'react-flow-app';
import { flowApp } from '../example/app.flow';

const run = (adapter: FlowAdapter, initial: { flow: 'home' | 'checkout' } = { flow: 'home' }) => {
	const engine = createFlowEngine(flowApp, { initial, deferStartEvents: true });
	adapter.attach(engine as never);
	engine.releaseStartEvents();
	return engine;
};

describe('analytics: GA4', () => {
	it('page_view com título do meta, location absoluto e referrer do passo anterior', () => {
		const calls: unknown[][] = [];
		const engine = run(ga4({ gtag: () => (...args) => calls.push(args), origin: 'https://loja.pt' }));

		engine.dispatch('openCart');

		assert.deepEqual(calls, [
			['event', 'flow_start', { flow: 'home', step: 'dashboard', source: 'initial' }],
			[
				'event',
				'page_view',
				{
					page_title: 'Início',
					page_location: 'https://loja.pt/dashboard',
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
					page_title: 'Carrinho',
					page_location: 'https://loja.pt/checkout/cart',
					page_referrer: 'https://loja.pt/dashboard',
					flow: 'checkout',
					step: 'cart',
				},
			],
		]);
	});

	it('sem gtag carregado não falha (snippet bloqueado por um ad blocker, por exemplo)', () => {
		const engine = run(ga4({ gtag: () => undefined }));
		engine.dispatch('openCart');
		assert.equal(engine.getSnapshot().step, 'cart');
	});
});

describe('analytics: Segment', () => {
	it('page(nome, props) e eventos de flow com a convenção "Object Action"', () => {
		const calls: string[] = [];
		const client = {
			page: (name: string, props?: Record<string, unknown>) => calls.push(`page ${name} ${props?.path} ${props?.referrer}`),
			track: (name: string, props?: Record<string, unknown>) => calls.push(`track ${name} ${JSON.stringify(props)}`),
		};
		const engine = run(segment({ client: () => client, origin: 'https://loja.pt', flows: false }), { flow: 'checkout' });

		engine.dispatch('checkout', { loggedIn: true }, { params: { orderId: '42' } });
		engine.back();

		assert.deepEqual(calls, [
			'page Carrinho /checkout/cart undefined',
			'page Pagamento /checkout/pay/42 https://loja.pt/checkout/cart',
			'page Carrinho /checkout/cart https://loja.pt/checkout/pay/42',
		]);
	});
});

describe('analytics: mapeamento', () => {
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

	it('ações são opt-in: só as listadas saem, com o que o mapeamento escolher do payload', () => {
		const { calls, sink } = sinkFor();
		const engine = run(
			analytics(sink, {
				flows: false,
				page: false,
				actions: {
					checkout: payload => ({ name: 'checkout', properties: { loggedIn: payload.loggedIn } }),
					// Devolver false salta este envio (ex.: só interessa o pagamento falhado).
					pay: payload => (payload.ok ? false : { name: 'payment_failed' }),
				},
			}),
			{ flow: 'checkout' }
		);

		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('cancel'); // não listada
		engine.dispatch('checkout', { loggedIn: true });
		engine.dispatch('pay', { ok: false });
		engine.dispatch('retry');
		engine.dispatch('pay', { ok: true });

		assert.deepEqual(calls, [
			'track checkout {"loggedIn":true}',
			'track checkout {"loggedIn":true}',
			'track payment_failed',
		]);
	});

	it('page personalizável: título, propriedades ou saltar passos', () => {
		const { calls, sink } = sinkFor();
		const engine = run(
			analytics(sink, {
				flows: false,
				page: event =>
					event.flow === 'auth' ? false : { properties: { funnel: event.meta?.funnel ?? 'none' } },
			}),
			{ flow: 'checkout' }
		);

		engine.dispatch('checkout', { loggedIn: false });

		assert.deepEqual(calls, ['page Carrinho /checkout/cart {"funnel":"checkout"}']);
	});

	it('consentimento: nada sai enquanto enabled() for false, e o referrer continua correto depois', () => {
		const { calls, sink } = sinkFor();
		let consent = false;
		const seen: Array<string | undefined> = [];
		const engine = run(
			analytics(
				{ ...sink, page: view => (sink.page(view), seen.push(view.referrer)) },
				{ flows: false, enabled: () => consent }
			)
		);

		engine.dispatch('openCart');
		assert.deepEqual(calls, []);

		consent = true;
		engine.dispatch('checkout', { loggedIn: true });

		assert.deepEqual(calls, ['page Pagamento /checkout/pay/:orderId']);
		assert.deepEqual(seen, ['/checkout/cart']);
	});

	it('um erro no SDK de analytics não parte a navegação', () => {
		const error = mock.method(console, 'error', () => undefined);
		const engine = run(
			analytics({
				page: () => {
					throw new Error('SDK em baixo');
				},
				track: () => undefined,
			})
		);

		engine.dispatch('openCart');

		assert.equal(engine.getSnapshot().step, 'cart');
		assert.ok(error.mock.callCount() > 0);
		error.mock.restore();
	});
});
