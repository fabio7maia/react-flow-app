/* cspell:disable */
/**
 * Caracterização da v2 — listeners, ciclo de vida e URL.
 * Fixa o comportamento atual (não o ideal). Ver README.md nesta pasta.
 */
import { createHarness } from './harness';

const spec = { a: ['next', 'toOther'], b: ['next'], x: ['done'] } as const;

describe('v2 · eventos', () => {
	it('E01 · arranque emite mount do passo inicial', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		h.listenFlow(f);
		await h.render({ initialFlowName: 'f' });

		expect(h.events).toEqual(['flow mount @f.a']);
		await h.unmount();
	});

	it('E02 · dispatch emite dispatch (no passo de origem, com a ação) e depois mount do destino', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		h.listenFlow(f);
		await h.render({ initialFlowName: 'f' });
		h.events.length = 0;

		await h.dispatch('next');

		expect(h.events).toEqual(['flow dispatch:next @f.a', 'flow mount @f.b']);
		await h.unmount();
	});

	it('E03 · o payload do dispatch chega aos listeners', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		const received: unknown[] = [];
		f.listen(input => received.push(input.dispatch?.payload));
		await h.render({ initialFlowName: 'f' });

		await h.dispatch('next', { orderId: 42 });

		expect(received).toContainEqual({ orderId: 42 });
		await h.unmount();
	});

	it('E04 · back emite back (já no passo de destino) e depois mount', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		h.listenFlow(f);
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');
		h.events.length = 0;

		await h.back();

		expect(h.events).toEqual(['flow back @f.b', 'flow mount @f.a']);
		await h.unmount();
	});

	it('E05 · o url do evento é /baseUrl/url-do-passo (ou o nome do passo)', async () => {
		const h = createHarness(spec);
		const f = h.flow('f', '/shop/').steps({ a: { url: 'start' }, b: {} });
		f.step('a')({ next: 'b' });
		const urls: string[] = [];
		f.listen(input => urls.push(input.url));
		await h.render({ initialFlowName: 'f' });

		await h.dispatch('next');

		expect(urls).toEqual(['/shop/start', '/shop/start', '/shop/b']);
		await h.unmount();
	});

	it('E06 · a prop listen do Provider recebe os eventos de todos os flows', async () => {
		const h = createHarness(spec);
		const main = h.flow('main').steps({ a: {} });
		const other = h.flow('other').steps({ x: {} });
		main.step('a')({ toOther: () => other.navigateTo('x') });
		await h.render({ initialFlowName: 'main', withListenProp: true });

		await h.dispatch('toOther');

		expect(h.events).toEqual(['provider mount @main.a', 'provider dispatch:toOther @main.a', 'provider mount @other.x']);
		await h.unmount();
	});

	it('E07 · onFlowMount / onFlowUnmount são chamados ao mudar de flow', async () => {
		const h = createHarness(spec);
		const main = h.flow('main').steps({ a: {} });
		const other = h.flow('other').steps({ x: {} });
		main.step('a')({ toOther: () => other.navigateTo('x') });
		const calls: string[] = [];
		await h.render({
			initialFlowName: 'main',
			onFlowMount: { [h.name('main')]: () => calls.push('mount main'), [h.name('other')]: () => calls.push('mount other') },
			onFlowUnmount: { [h.name('main')]: () => calls.push('unmount main') },
		});

		await h.dispatch('toOther');

		expect(calls).toEqual(['mount main', 'unmount main', 'mount other']);
		await h.unmount();
	});
});

describe('v2 · URL', () => {
	it('U01 · withUrl escreve #/baseUrl/passo com replaceState (sem novas entradas no histórico do browser)', async () => {
		const h = createHarness(spec);
		const f = h.flow('f', 'shop').steps({ a: {}, b: { url: 'pay' } });
		f.step('a')({ next: 'b' });
		const replace = jest.spyOn(window.history, 'replaceState');
		const push = jest.spyOn(window.history, 'pushState');
		await h.render({ initialFlowName: 'f', options: { withUrl: true } });

		await h.dispatch('next');

		expect(window.location.hash).toBe('#/shop/pay');
		expect(replace).toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		replace.mockRestore();
		push.mockRestore();
		await h.unmount();
	});

	it('U02 · withUrl: false não toca no URL', async () => {
		const h = createHarness(spec);
		const f = h.flow('f', 'shop').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		window.history.replaceState(null, '', '#/unchanged');
		await h.render({ initialFlowName: 'f', options: { withUrl: false } });

		await h.dispatch('next');

		expect(window.location.hash).toBe('#/unchanged');
		await h.unmount();
	});

	it('U03 · scrollRestoration: o back repõe a posição de scroll do passo de destino (~300 ms depois)', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		const scrollTo = jest.fn();
		const originalScrollTo = window.scrollTo;
		window.scrollTo = scrollTo as never;
		await h.render({ initialFlowName: 'f', options: { scrollRestoration: true } });

		Object.defineProperty(window, 'scrollY', { value: 640, configurable: true });
		await h.dispatch('next');
		Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
		await h.back();
		await new Promise(resolve => setTimeout(resolve, 350));

		expect(h.screen()).toBe('a');
		expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 640 });
		window.scrollTo = originalScrollTo;
		await h.unmount();
	});
});
