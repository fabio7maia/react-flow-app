/* cspell:disable */
/**
 * Caracterização da v2 — regras de histórico.
 * Fixa o comportamento atual (não o ideal). Ver README.md nesta pasta.
 */
import { createHarness } from './harness';

const spec = { a: ['next', 'fn'], b: ['next', 'back2a'], c: ['next', 'fn'], d: ['next'] } as const;

describe('v2 · histórico', () => {
	it('H01 · ignoreHistory: ao sair do passo, ele não fica no histórico', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: { ignoreHistory: true }, c: {} });
		f.step('a')({ next: 'b' });
		f.step('b')({ next: 'c' });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');
		await h.dispatch('next');

		expect(h.history()).toEqual(['a']);
		await h.back();
		expect(h.screen()).toBe('a');
		await h.unmount();
	});

	it('H02 · back a partir de um passo ignoreHistory volta ao passo anterior', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: { ignoreHistory: true }, c: {} });
		f.step('a')({ next: 'b' });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');

		await h.back();

		expect(h.screen()).toBe('a');
		await h.unmount();
	});

	it('H03 · clearHistory: ao chegar ao passo, o histórico é limpo e o back não faz nada', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: { clearHistory: true } });
		f.step('a')({ next: 'b' });
		f.step('b')({ next: 'c' });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');
		await h.dispatch('next');

		expect(h.history()).toEqual([]);
		await h.back();
		expect(h.screen()).toBe('c');
		await h.unmount();
	});

	it('H04 · clearHistory: o passo seguinte só tem o passo clearHistory no histórico', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: { clearHistory: true }, c: {} });
		f.step('a')({ next: 'b' });
		f.step('b')({ next: 'c' });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');
		await h.dispatch('next');

		expect(h.history()).toEqual(['b']);
		await h.back();
		expect(h.screen()).toBe('b');
		await h.unmount();
	});

	it('H05 · sem allowCyclicHistory, voltar a um passo já visitado corta o histórico', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: {} });
		f.step('a')({ next: 'b' });
		f.step('b')({ next: 'c', back2a: 'a' });
		f.step('c')({ next: 'a' });
		await h.render({ initialFlowName: 'f' });

		for (let i = 0; i < 3; i++) {
			await h.dispatch('next');
			await h.dispatch('next');
			await h.dispatch('next');
		}

		expect(h.screen()).toBe('a');
		expect(h.history()).toEqual(['a']);
		await h.unmount();
	});

	it('H06 · allowCyclicHistory só no destino não chega: o corte também se aplica ao passo que se deixa', async () => {
		// PARTICULARIDADE: ao sair de `b` (sem allowCyclicHistory), o histórico é cortado na primeira
		// ocorrência de `b`. Para um ciclo crescer, todos os passos do ciclo precisam da opção.
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: { allowCyclicHistory: true }, b: {} });
		f.step('a')({ next: 'b' });
		f.step('b')({ back2a: 'a' });
		await h.render({ initialFlowName: 'f' });

		for (let i = 0; i < 3; i++) {
			await h.dispatch('next');
			await h.dispatch('back2a');
		}

		expect(h.screen()).toBe('a');
		expect(h.history()).toEqual(['a', 'b']);
		await h.unmount();
	});

	it('H07 · com allowCyclicHistory em todos os passos do ciclo, o histórico cresce em cada volta', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: { allowCyclicHistory: true }, b: { allowCyclicHistory: true } });
		f.step('a')({ next: 'b' });
		f.step('b')({ back2a: 'a' });
		await h.render({ initialFlowName: 'f' });

		for (let i = 0; i < 3; i++) {
			await h.dispatch('next');
			await h.dispatch('back2a');
		}

		expect(h.screen()).toBe('a');
		expect(h.history()).toEqual(['a', 'b', 'a', 'b', 'a', 'b']);
		await h.unmount();
	});

	it('H08 · dispatch com a opção ignoreHistory não guarda o passo atual', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: {} });
		f.step('a')({ next: 'b' });
		f.step('b')({ next: 'c' });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');

		await h.dispatch('next', undefined, { ignoreHistory: true });

		expect(h.history()).toEqual(['a']);
		await h.unmount();
	});

	it('H09 · função que devolve navigateTo com options.history substitui o histórico', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: {}, d: {} });
		f.step('a')({ fn: () => f.navigateTo('d', { history: ['b', 'c'] }) });
		await h.render({ initialFlowName: 'f' });

		await h.dispatch('fn');

		expect(h.screen()).toBe('d');
		expect(h.history()).toEqual(['b', 'c']);
		await h.back();
		expect(h.screen()).toBe('c');
		await h.unmount();
	});

	it('H10 · função que devolve navigateTo com options.clearHistory limpa o histórico', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {}, c: {} });
		f.step('a')({ next: 'b' });
		f.step('b')({ next: 'c' });
		f.step('c')({ fn: () => f.navigateTo('a', { clearHistory: true }) });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');
		await h.dispatch('next');

		await h.dispatch('fn');

		expect(h.screen()).toBe('a');
		expect(h.history()).toEqual([]);
		await h.unmount();
	});

	it('H11 · initialHistory do Provider permite back a partir do primeiro ecrã', async () => {
		const h = createHarness(spec);
		h.flow('f').steps({ a: {}, b: {}, c: {} });
		await h.render({ initialFlowName: 'f', initialStepName: 'c', initialHistory: ['a', 'b'] });

		expect(h.history()).toEqual(['a', 'b']);
		await h.back();
		expect(h.screen()).toBe('b');
		await h.unmount();
	});

	it('H12 · clearHistory() do useFlow limpa o histórico do flow atual', async () => {
		const h = createHarness(spec);
		const f = h.flow('f').steps({ a: {}, b: {} });
		f.step('a')({ next: 'b' });
		await h.render({ initialFlowName: 'f' });
		await h.dispatch('next');

		h.api().clearHistory();

		expect(h.history()).toEqual([]);
		await h.unmount();
	});
});
