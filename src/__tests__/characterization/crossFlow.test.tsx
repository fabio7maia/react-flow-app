/* cspell:disable */
/**
 * Caracterização da v2 — navegação entre flows e "anotherObjects".
 * Fixa o comportamento atual (não o ideal). Ver README.md nesta pasta.
 */
import { createHarness } from './harness';

const spec = { a: ['next', 'toOther'], b: ['next', 'toOther'], x: ['next', 'done'], y: ['done'] } as const;

describe('v2 · entre flows', () => {
	it('X01 · função que devolve navigateTo de outro flow muda de flow', async () => {
		const h = createHarness(spec);
		const main = h.flow('main').steps({ a: {}, b: {} });
		const other = h.flow('other').steps({ x: {}, y: {} });
		main.step('a')({ toOther: () => other.navigateTo('y') });
		await h.render({ initialFlowName: 'main' });

		await h.dispatch('toOther');

		expect(h.screen()).toBe('y');
		expect(h.strip(h.api().getCurrentStep()?.flowName ?? '')).toBe('other');
		await h.unmount();
	});

	it('X02 · back no primeiro passo do outro flow volta ao passo de origem', async () => {
		const h = createHarness(spec);
		const main = h.flow('main').steps({ a: {}, b: {} });
		const other = h.flow('other').steps({ x: {}, y: {} });
		main.step('a')({ next: 'b' });
		main.step('b')({ toOther: () => other.navigateTo('x') });
		await h.render({ initialFlowName: 'main' });
		await h.dispatch('next');
		await h.dispatch('toOther');

		expect(h.api().hasPreviousStep()).toBe(true);
		expect(h.api().getPreviousStep()).toEqual({ flowName: h.name('main'), name: 'b' });

		await h.back();

		expect(h.screen()).toBe('b');
		expect(h.strip(h.api().getCurrentStep()?.flowName ?? '')).toBe('main');
		await h.unmount();
	});

	it('X03 · back dentro do outro flow usa primeiro o histórico desse flow', async () => {
		const h = createHarness(spec);
		const main = h.flow('main').steps({ a: {} });
		const other = h.flow('other').steps({ x: {}, y: {} });
		main.step('a')({ toOther: () => other.navigateTo('x') });
		other.step('x')({ next: 'y' });
		await h.render({ initialFlowName: 'main' });
		await h.dispatch('toOther');
		await h.dispatch('next');

		await h.back();
		expect(h.screen()).toBe('x');
		await h.back();
		expect(h.screen()).toBe('a');
		await h.unmount();
	});

	it('X04 · back no primeiro passo do outro flow emite backExit nos listeners desse flow', async () => {
		const h = createHarness(spec);
		const main = h.flow('main').steps({ a: {} });
		const other = h.flow('other').steps({ x: {} });
		main.step('a')({ toOther: () => other.navigateTo('x') });
		h.listenFlow(other);
		await h.render({ initialFlowName: 'main' });
		await h.dispatch('toOther');
		h.events.length = 0;

		await h.back();

		expect(h.events).toContain('flow backExit @other.x');
		await h.unmount();
	});

	it('X05 · useFlowManager().start muda de flow e o back volta ao flow anterior', async () => {
		const h = createHarness(spec);
		h.flow('main').steps({ a: {}, b: {} });
		h.flow('other').steps({ x: {}, y: {} });
		await h.render({ initialFlowName: 'main' });

		await h.start('other', 'y');

		expect(h.screen()).toBe('y');
		await h.back();
		expect(h.screen()).toBe('a');
		await h.unmount();
	});

	it('X06 · start com options.clearHistory esquece o flow de origem', async () => {
		const h = createHarness(spec);
		h.flow('main').steps({ a: {} });
		h.flow('other').steps({ x: {} });
		await h.render({ initialFlowName: 'main' });

		await h.start('other', 'x', { clearHistory: true });
		await h.back();

		expect(h.screen()).toBe('x');
		expect(h.api().hasPreviousStep()).toBe(false);
		await h.unmount();
	});

	it('X07 · voltar a um flow já visitado retoma o passo onde estava', async () => {
		const h = createHarness(spec);
		const main = h.flow('main').steps({ a: {}, b: {} });
		const other = h.flow('other').steps({ x: {} });
		main.step('a')({ next: 'b' });
		main.step('b')({ toOther: () => other.navigateTo('x') });
		other.step('x')({ done: () => main.navigateTo() });
		await h.render({ initialFlowName: 'main' });
		await h.dispatch('next');
		await h.dispatch('toOther');

		await h.dispatch('done');

		expect(h.strip(h.api().getCurrentStep()?.flowName ?? '')).toBe('main');
		expect(h.screen()).toBe('b');
		await h.unmount();
	});
});

describe('v2 · anotherObjects (ações fora dos ecrãs, ex.: modais)', () => {
	it('X08 · sem a propriedade `name` no objeto, o dispatch a partir do objeto é ignorado', async () => {
		const h = createHarness(spec, { modal: { actions: ['restart'] } });
		const main = h.flow('main').steps({ a: {}, b: {} });
		main.step('a')({ next: 'b' });
		main.anotherObject('modal')({ restart: 'a' });
		await h.render({ initialFlowName: 'main' });
		await h.dispatch('next');

		await h.dispatchFrom('modal', 'restart');

		expect(h.screen()).toBe('b');
		await h.unmount();
	});

	it('X09 · com `name` no objeto, o dispatch a partir do objeto usa as transições do objeto', async () => {
		const h = createHarness(spec, { modal: { name: 'modal', actions: ['restart'] } });
		const main = h.flow('main').steps({ a: {}, b: {} });
		main.step('a')({ next: 'b' });
		main.anotherObject('modal')({ restart: 'a' });
		await h.render({ initialFlowName: 'main' });
		await h.dispatch('next');

		await h.dispatchFrom('modal', 'restart');

		expect(h.screen()).toBe('a');
		await h.unmount();
	});
});
