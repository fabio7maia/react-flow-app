import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFlowEngine, type FlowEvent } from 'react-flow-app';
import { flowApp } from '../example/app.flow';

/**
 * Contrato de eventos (v1). Estes testes fixam nomes, campos e ordem: qualquer
 * alteração aparece aqui como diff e é uma alteração de contrato para quem integra
 * (analytics, logging). Só o `timestamp` fica de fora, por não ser determinístico.
 */
const trace = (engine: ReturnType<typeof createFlowEngine>): Array<Record<string, unknown>> => {
	const events: Array<Record<string, unknown>> = [];
	engine.on('*', (event: FlowEvent) => {
		const { timestamp, ...rest } = event;
		assert.equal(typeof timestamp, 'number');
		// JSON remove os campos `undefined` (ex.: `from` no arranque, `overlay` fora de overlays).
		events.push(JSON.parse(JSON.stringify(rest)));
	});
	return events;
};

const cart = { flow: 'checkout', step: 'cart' };
const cartMeta = { title: 'Carrinho', funnel: 'checkout' };

describe('contrato de eventos v1', () => {
	it('arranque: flow:start → step:enter', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' }, deferStartEvents: true });
		const events = trace(engine);
		engine.releaseStartEvents();

		assert.deepEqual(events, [
			{ type: 'flow:start', ...cart, source: 'initial', navigationId: 1, url: '/checkout/cart' },
			{ type: 'step:enter', ...cart, direction: 'forward', meta: cartMeta, navigationId: 1, url: '/checkout/cart' },
		]);
	});

	it('arranque num passo com parâmetros: o flow:start já leva o URL com os parâmetros', () => {
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

	it('dispatch no mesmo flow: action → step:leave → step:enter', () => {
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
				meta: { title: 'Pagamento', funnel: 'checkout' },
				...nav,
				url: '/checkout/pay/42',
			},
		]);
	});

	it('goto para outro flow: action → step:leave → flow:exit → flow:start → step:enter', () => {
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
			{
				type: 'step:enter',
				...login,
				direction: 'forward',
				from: cart,
				meta: { title: 'Login' },
				...nav,
				url: '/auth/login',
			},
		]);
	});

	it('goto.exit(): o flow sai e o de origem retoma no passo que o abriu, com direction back', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		engine.dispatch('checkout', { loggedIn: false });
		const events = trace(engine);

		engine.dispatch('loggedIn');

		assert.deepEqual(
			events.map(event => `${event.type} ${event.flow}.${event.step} ${event.reason ?? event.source ?? event.direction ?? ''}`.trim()),
			[
				'action auth.login',
				'step:leave auth.login exit',
				'flow:exit auth.login exit',
				'flow:start checkout.cart back',
				'step:enter checkout.cart back',
			]
		);
	});

	it('back entre flows: step:leave → flow:exit → flow:start → step:enter, todos com reason/source back', () => {
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
			{
				type: 'step:enter',
				...dashboard,
				direction: 'back',
				from: cart,
				meta: { title: 'Início' },
				...nav,
				url: '/dashboard',
			},
		]);
	});

	it('back sem histórico: só back:empty; ação sem transição: só action:unhandled', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const events = trace(engine);

		engine.back();
		engine.dispatch('refund');

		assert.deepEqual(events, [
			{ type: 'back:empty', ...cart, navigationId: 2, url: '/checkout/cart' },
			{ type: 'action:unhandled', ...cart, action: 'refund', navigationId: 3, url: '/checkout/cart' },
		]);
	});

	it('run-to-completion: uma navegação pedida num listener só corre depois de a atual terminar', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'checkout' } });
		const seen: string[] = [];
		engine.on('*', event => seen.push(`${event.type}@${event.step}#${event.navigationId}`));
		// Ex.: um "guard" que manda o utilizador de volta ao carrinho assim que entra no pagamento.
		engine.on('step:enter', event => {
			if (event.step === 'payment') {
				engine.dispatch('cancel');
				seen.push(`(ainda em ${engine.getSnapshot().step})`);
			}
		});

		engine.dispatch('checkout', { loggedIn: true });

		assert.deepEqual(seen, [
			'action@cart#2',
			'step:leave@cart#2',
			// Ordem de entrega: listeners do tipo, depois '*', depois integrações da app.
			'(ainda em payment)',
			'step:enter@payment#2',
			'action@payment#3',
			'step:leave@payment#3',
			'step:enter@cart#3',
		]);
		assert.equal(engine.getSnapshot().step, 'cart');
	});

	it('navigationId é partilhado pelos eventos de uma navegação e cresce estritamente entre navegações', () => {
		const engine = createFlowEngine(flowApp, { initial: { flow: 'home' } });
		const ids: number[] = [];
		engine.on('*', event => ids.push(event.navigationId));

		engine.dispatch('openCart');
		engine.dispatch('checkout', { loggedIn: false });
		engine.dispatch('cancel');
		engine.back();

		const groups = [...new Set(ids)];
		assert.deepEqual(groups, [...groups].sort((a, b) => a - b));
		assert.equal(groups.length, 4);
	});
});
