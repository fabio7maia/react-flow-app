/* cspell:disable */
/**
 * Caracterização da v2 — navegação básica.
 * Fixa o comportamento atual (não o ideal). Ver README.md nesta pasta.
 */
import { createHarness } from './harness';

const spec = { a: ['next', 'skip', 'noop', 'fn'], b: ['next'], c: ['next'] } as const;

describe('v2 · navegação básica', () => {
	it('C01 · sem initialStep, começa no primeiro passo declarado', async () => {
		const h = createHarness(spec);
		h.flow('f').steps({ a: {}, b: {} });
		await h.render({ initialFlowName: 'f' });

		expect(h.screen()).toBe('a');
		await h.unmount();
	});

	it('C02 · initialStep na definição do passo é respeitado', async () => {
		const h = createHarness(spec);
		h.flow('f').steps({ a: {}, b: { initialStep: true } });
		await h.render({ initialFlowName: 'f' });

		expect(h.screen()).toBe('b');
		await h.unmount();
	});

	it('C03 · initialStepName do Provider sobrepõe-se ao initialStep', async () => {
		const h = createHarness(spec);
		h.flow('f').steps({ a: {}, b: { initialStep: true }, c: {} });
		await h.render({ initialFlowName: 'f', initialStepName: 'c' });

		expect(h.screen()).toBe('c');
		await h.unmount();
	});

	it('C04 · dispatch com destino em string navega e guarda o passo anterior no histórico', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: {} });
		f.step('a')({ next: 'b', skip: 'c' });
		await h.render({ initialFlowName: 'f' });

		await h.dispatch('skip');

		expect(h.screen()).toBe('c');
		expect(h.history()).toEqual(['a']);
		await h.unmount();
	});

	it('C05 · dispatch de uma ação sem transição não faz nada', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		h.listenFlow(f);
		await h.render({ initialFlowName: 'f' });
		h.events.length = 0;

		await h.dispatch('noop');

		expect(h.screen()).toBe('a');
		expect(h.history()).toEqual([]);
		expect(h.events).toEqual([]);
		await h.unmount();
	});

	it('C06 · back volta ao passo anterior e retira-o do histórico', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: {} });
		f.step('a')({ next: 'b' });
		f.step('b')({ next: 'c' });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');
		await h.dispatch('next');

		await h.back();

		expect(h.screen()).toBe('b');
		expect(h.history()).toEqual(['a']);
		await h.unmount();
	});

	it('C07 · back no primeiro passo (sem flow de origem) não faz nada', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		h.listenFlow(f);
		await h.render({ initialFlowName: 'f' });
		h.events.length = 0;

		await h.back();

		expect(h.screen()).toBe('a');
		expect(h.events).toEqual([]);
		await h.unmount();
	});

	it('C08 · destino em função sem retorno: executa o efeito e fica no mesmo passo', async () => {
		const h = createHarness(spec);
		const effect = jest.fn();
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ fn: effect });
		await h.render({ initialFlowName: 'f' });

		await h.dispatch('fn');

		expect(effect).toHaveBeenCalledTimes(1);
		expect(h.screen()).toBe('a');
		await h.unmount();
	});

	it('C09 · destino em função que devolve navigateTo de um passo do mesmo flow', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: {} });
		f.step('a')({ fn: () => f.navigateTo('c') });
		await h.render({ initialFlowName: 'f' });

		await h.dispatch('fn');

		expect(h.screen()).toBe('c');
		expect(h.history()).toEqual(['a']);
		await h.unmount();
	});

	it('C10 · getCurrentStep, hasPreviousStep e getLastAction refletem a navegação', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		await h.render({ initialFlowName: 'f' });

		expect(h.api().hasPreviousStep()).toBe(false);
		await h.dispatch('next');

		expect(h.strip(h.api().getCurrentStep()?.flowName ?? '')).toBe('f');
		expect(h.api().getCurrentStep()?.name).toBe('b');
		expect(h.api().hasPreviousStep()).toBe(true);
		expect(h.api().getLastAction()).toBe('dispatch');

		await h.back();
		expect(h.api().getLastAction()).toBe('back');
		await h.unmount();
	});
});
