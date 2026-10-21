/**
 * Paridade v2 → v3: os mesmos cenários (IDs) dos testes de caracterização da v2
 * (src/__tests__/characterization na branch test/v2-characterization), corridos contra o engine v3.
 *
 * Cada teste diz no nome se o comportamento é:
 *   [igual]       mesmo resultado observável
 *   [equivalente] mesmo resultado com outra API/nome de evento
 *   [diverge]     resultado diferente, por decisão (o comentário diz o que a v2 faz)
 * Cenários sem equivalente no spike aparecem como skip, com o motivo.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	createFlowApp,
	createFlowEngine,
	defineFlow,
	defineScreen,
	effect,
	type FlowDef,
	type FlowEvent,
	type GotoRef,
} from 'react-flow-app';

const loader = () => Promise.resolve({ default: null });
const screen = <const A extends readonly string[]>(name: string, actions: A) =>
	defineScreen({ name, actions, meta: { title: name }, loader });

const a = screen('a', ['next', 'skip', 'noop', 'fn', 'back2a', 'toOther']);
const b = screen('b', ['next', 'back2a', 'toOther']);
const c = screen('c', ['next', 'fn']);
const d = screen('d', ['next']);
const x = screen('x', ['next', 'done']);
const y = screen('y', ['done']);

/** Os flows destes cenários não estão no `Register` da app de exemplo: o `goto` tipado não os conhece. */
const to = (flow: string, step: string): GotoRef => ({ kind: 'goto', flow, step }) as GotoRef;

const run = (flows: readonly FlowDef[], initial: { flow: string; step?: string; history?: string[] }) => {
	const engine = createFlowEngine(createFlowApp(flows), { initial: initial as never });
	const events: string[] = [];
	engine.on('*', (event: FlowEvent) => {
		const detail = 'action' in event && event.type === 'action' ? `:${event.action}` : '';
		const reason = 'reason' in event ? `(${event.reason})` : '';
		events.push(`${event.type}${detail}${reason}@${event.flow}.${event.step}`);
	});
	return {
		engine,
		events,
		at: () => `${engine.getSnapshot().flow}.${engine.getSnapshot().step}`,
		history: () => engine.getSnapshot().history.map(entry => entry.step),
	};
};

const pending = (id: string, reason: string): void => it(`${id} · ${reason}`, { skip: reason });

describe('paridade · navegação básica', () => {
	it('C01 [igual] sem initial, começa no primeiro passo declarado', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		assert.equal(run([f], { flow: 'f' }).at(), 'f.a');
	});

	it('C02 [igual] initial na definição do passo', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b, initial: true } } });
		assert.equal(run([f], { flow: 'f' }).at(), 'f.b');
	});

	it('C03 [igual] passo explícito no arranque sobrepõe-se ao initial', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b, initial: true }, c: { screen: c } } });
		assert.equal(run([f], { flow: 'f', step: 'c' }).at(), 'f.c');
	});

	it('C04 [igual] destino em string navega e guarda o passo anterior', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b }, c: { screen: c } } });
		f.transitions({ a: { next: 'b', skip: 'c' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('skip');
		assert.equal(t.at(), 'f.c');
		assert.deepEqual(t.history(), ['a']);
	});

	it('C05 [diverge] ação sem transição não navega, mas a v3 emite action:unhandled (a v2 não emite nada)', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('noop');
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.events, ['action:unhandled@f.a']);
	});

	it('C06 [igual] back volta ao passo anterior e retira-o do histórico', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b }, c: { screen: c } } });
		f.transitions({ a: { next: 'b' }, b: { next: 'c' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		t.engine.back();
		assert.equal(t.at(), 'f.b');
		assert.deepEqual(t.history(), ['a']);
	});

	it('C07 [diverge] back no primeiro passo não navega, mas a v3 emite back:empty (a v2 não emite nada)', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a } } });
		const t = run([f], { flow: 'f' });
		t.engine.back();
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.events, ['back:empty@f.a']);
	});

	it('C08 [equivalente] função sem retorno → effect(): executa e fica no mesmo passo', () => {
		let calls = 0;
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { fn: effect(() => calls++) } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('fn');
		assert.equal(calls, 1);
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.events, ['action:fn@f.a']);
	});

	it('C09 [equivalente] função que devolve navigateTo do mesmo flow → destino em string', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b }, c: { screen: c } } });
		f.transitions({ a: { fn: 'c' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('fn');
		assert.equal(t.at(), 'f.c');
		assert.deepEqual(t.history(), ['a']);
	});

	it('C10 [equivalente] hasPreviousStep → history.length; getLastAction → direction do step:enter', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		const directions: string[] = [];
		t.engine.on('step:enter', event => directions.push(event.direction));
		t.engine.dispatch('next');
		assert.equal(t.engine.getSnapshot().history.length > 0, true);
		t.engine.back();
		assert.deepEqual(directions, ['forward', 'back']);
	});
});

describe('paridade · histórico', () => {
	const linear = (options: Record<string, object> = {}) => {
		const f = defineFlow({
			name: 'f',
			steps: {
				a: { screen: a, ...options.a },
				b: { screen: b, ...options.b },
				c: { screen: c, ...options.c },
				d: { screen: d, ...options.d },
			},
		});
		f.transitions({ a: { next: 'b' }, b: { next: 'c' }, c: { next: 'd' } });
		return f;
	};

	it('H01 [igual] ignoreHistory: ao sair do passo, ele não fica no histórico', () => {
		const t = run([linear({ b: { ignoreHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		assert.deepEqual(t.history(), ['a']);
		t.engine.back();
		assert.equal(t.at(), 'f.a');
	});

	it('H02 [igual] back a partir de um passo ignoreHistory volta ao anterior', () => {
		const t = run([linear({ b: { ignoreHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.back();
		assert.equal(t.at(), 'f.a');
	});

	it('H03 [igual] clearHistory: ao chegar, o histórico é limpo e o back não navega', () => {
		const t = run([linear({ c: { clearHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		assert.deepEqual(t.history(), []);
		t.engine.back();
		assert.equal(t.at(), 'f.c');
	});

	it('H04 [igual] depois de um passo clearHistory, só ele fica no histórico', () => {
		const t = run([linear({ b: { clearHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		assert.deepEqual(t.history(), ['b']);
		t.engine.back();
		assert.equal(t.at(), 'f.b');
	});

	it('H05 [equivalente] ciclo sem allowCyclicHistory: o back não navega (a v2 guarda ["a"], a v3 guarda [])', () => {
		const cyclic = defineFlow({ name: 'g', steps: { a: { screen: a }, b: { screen: b }, c: { screen: d } } });
		cyclic.transitions({ a: { next: 'b' }, b: { next: 'c' }, c: { next: 'a' } });
		const t = run([cyclic], { flow: 'g' });
		for (let i = 0; i < 9; i++) t.engine.dispatch('next');
		assert.equal(t.at(), 'g.a');
		// v2: history === ['a'] (o passo atual aparece no próprio histórico); o back também não navega.
		assert.deepEqual(t.history(), []);
		t.engine.back();
		assert.equal(t.at(), 'g.a');
	});

	it('H06 [igual] allowCyclicHistory só num passo do ciclo não chega: cada passo que se repete precisa da opção', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a, allowCyclicHistory: true }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' }, b: { back2a: 'a' } });
		const t = run([f], { flow: 'f' });
		for (let i = 0; i < 3; i++) {
			t.engine.dispatch('next');
			t.engine.dispatch('back2a');
		}
		assert.deepEqual(t.history(), ['a', 'b']);
	});

	it('H07 [igual] allowCyclicHistory em todos os passos do ciclo: o histórico cresce', () => {
		const f = defineFlow({
			name: 'f',
			steps: { a: { screen: a, allowCyclicHistory: true }, b: { screen: b, allowCyclicHistory: true } },
		});
		f.transitions({ a: { next: 'b' }, b: { back2a: 'a' } });
		const t = run([f], { flow: 'f' });
		for (let i = 0; i < 3; i++) {
			t.engine.dispatch('next');
			t.engine.dispatch('back2a');
		}
		assert.deepEqual(t.history(), ['a', 'b', 'a', 'b', 'a', 'b']);
	});

	it('H08 [igual] dispatch com ignoreHistory não guarda o passo atual', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next', undefined, { ignoreHistory: true });
		assert.deepEqual(t.history(), ['a']);
	});

	it('H09 [equivalente] navigateTo com history → start(flow, passo, { history }) (não a partir de uma transição)', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.start('f' as never, 'd' as never, { history: ['b', 'c'] });
		assert.equal(t.at(), 'f.d');
		assert.deepEqual(t.history(), ['b', 'c']);
		t.engine.back();
		assert.equal(t.at(), 'f.c');
	});

	it('H10 [equivalente] navigateTo com clearHistory → start(flow, passo, { clearHistory })', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		t.engine.start('f' as never, 'a' as never, { clearHistory: true });
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.history(), []);
	});

	it('H11 [igual] initialHistory permite back a partir do primeiro ecrã', () => {
		const t = run([linear()], { flow: 'f', step: 'c', history: ['a', 'b'] });
		assert.deepEqual(t.history(), ['a', 'b']);
		t.engine.back();
		assert.equal(t.at(), 'f.b');
	});

	it('H12 [igual] clearHistory() limpa o histórico', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.clearHistory();
		assert.deepEqual(t.history(), []);
	});
});

describe('paridade · entre flows', () => {
	const flows = () => {
		const main = defineFlow({ name: 'main', steps: { a: { screen: a }, b: { screen: b } } });
		const other = defineFlow({ name: 'other', steps: { x: { screen: x }, y: { screen: y } } });
		return { main, other };
	};

	it('X01 [equivalente] navigateTo de outro flow → goto', () => {
		const { main, other } = flows();
		main.transitions({ a: { toOther: to('other', 'y') } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('toOther');
		assert.equal(t.at(), 'other.y');
	});

	it('X02 [igual] back no primeiro passo do outro flow volta ao passo de origem', () => {
		const { main, other } = flows();
		main.transitions({ a: { next: 'b' }, b: { toOther: to('other', 'x') } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('next');
		t.engine.dispatch('toOther');
		t.engine.back();
		assert.equal(t.at(), 'main.b');
	});

	it('X03 [igual] back dentro do outro flow usa primeiro o histórico desse flow', () => {
		const { main, other } = flows();
		main.transitions({ a: { toOther: to('other', 'x') } });
		other.transitions({ x: { next: 'y' } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('toOther');
		t.engine.dispatch('next');
		t.engine.back();
		assert.equal(t.at(), 'other.x');
		t.engine.back();
		assert.equal(t.at(), 'main.a');
	});

	it('X04 [equivalente] backExit → flow:exit(back) no flow que se deixa', () => {
		const { main, other } = flows();
		main.transitions({ a: { toOther: to('other', 'x') } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('toOther');
		t.events.length = 0;
		t.engine.back();
		assert.ok(t.events.includes('flow:exit(back)@other.x'));
	});

	it('X05 [igual] start de outro flow e back volta ao flow anterior', () => {
		const { main, other } = flows();
		const t = run([main, other], { flow: 'main' });
		t.engine.start('other' as never, 'y' as never);
		assert.equal(t.at(), 'other.y');
		t.engine.back();
		assert.equal(t.at(), 'main.a');
	});

	it('X06 [igual] start com clearHistory esquece o flow de origem', () => {
		const { main, other } = flows();
		const t = run([main, other], { flow: 'main' });
		t.engine.start('other' as never, 'x' as never, { clearHistory: true });
		t.engine.back();
		assert.equal(t.at(), 'other.x');
		assert.deepEqual(t.history(), []);
	});

	pending('X07', 'retomar um flow no passo onde estava: a v3 exige passo explícito no goto (decisão em aberto)');
	pending('X08', 'anotherObjects sem name: sem equivalente no spike (overlays por implementar)');
	pending('X09', 'anotherObjects com name: sem equivalente no spike (overlays por implementar)');
});

describe('paridade · eventos', () => {
	it('E01 [equivalente] mount inicial → flow:start + step:enter', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a } } });
		const engine = createFlowEngine(createFlowApp([f]));
		const events: string[] = [];
		engine.on('*', (event: FlowEvent) => events.push(`${event.type}@${event.flow}.${event.step}`));
		engine.start('f' as never);
		assert.deepEqual(events, ['flow:start@f.a', 'step:enter@f.a']);
	});

	it('E02 [equivalente] dispatch → mount passa a action → step:leave → step:enter', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('next');
		assert.deepEqual(t.events, ['action:next@f.a', 'step:leave(dispatch)@f.a', 'step:enter@f.b']);
	});

	it('E03 [igual] o payload do dispatch chega aos listeners', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		const payloads: unknown[] = [];
		t.engine.on('action', event => payloads.push(event.payload));
		t.engine.dispatch('next', { orderId: 42 });
		assert.deepEqual(payloads, [{ orderId: 42 }]);
	});

	it('E04 [equivalente] back → mount passa a step:leave(back) → step:enter(direction: back)', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('next');
		t.events.length = 0;
		t.engine.back();
		assert.deepEqual(t.events, ['step:leave(back)@f.b', 'step:enter@f.a']);
	});

	pending('E05', 'url nos eventos: sincronização com URL fora do âmbito do spike');

	it('E06 [equivalente] listen do Provider → integrations da app (todos os flows)', () => {
		const main = defineFlow({ name: 'main', steps: { a: { screen: a } } });
		const other = defineFlow({ name: 'other', steps: { x: { screen: x } } });
		main.transitions({ a: { toOther: to('other', 'x') } });
		const seen: string[] = [];
		const app = createFlowApp([main, other], { integrations: [event => seen.push(`${event.type}@${event.flow}`)] });
		const engine = createFlowEngine(app, { initial: { flow: 'main' } });
		engine.dispatch('toOther');
		assert.ok(seen.includes('step:enter@main'));
		assert.ok(seen.includes('step:enter@other'));
	});

	it('E07 [equivalente] onFlowMount/onFlowUnmount → flow:start / flow:exit(goto)', () => {
		const main = defineFlow({ name: 'main', steps: { a: { screen: a } } });
		const other = defineFlow({ name: 'other', steps: { x: { screen: x } } });
		main.transitions({ a: { toOther: to('other', 'x') } });
		const engine = createFlowEngine(createFlowApp([main, other]));
		const calls: string[] = [];
		engine.on('flow:start', event => calls.push(`mount ${event.flow}`));
		engine.on('flow:exit', event => calls.push(`unmount ${event.flow}`));
		engine.start('main' as never);
		engine.dispatch('toOther');
		assert.deepEqual(calls, ['mount main', 'unmount main', 'mount other']);
	});
});

describe('paridade · URL', () => {
	pending('U01', 'withUrl com replaceState: fora do âmbito do spike');
	pending('U02', 'withUrl: false: fora do âmbito do spike');
	pending('U03', 'scrollRestoration: fora do âmbito do spike');
});
