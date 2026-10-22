/**
 * v2 → v3 parity: the same scenarios (IDs) as the v2 characterization tests (see
 * test/parity/v2-scenarios.md), run against the v3 engine.
 *
 * Each test name says whether the behaviour is:
 *   [same]        same observable result
 *   [equivalent]  same result through another API or event name
 *   [diverges]    different result, on purpose (the comment says what v2 does)
 */
import assert from 'node:assert/strict';
import {
	browserHistory,
	createFlowApp,
	createFlowEngine,
	defineFlow,
	defineScreen,
	effect,
	type FlowDef,
	type FlowEvent,
	type GotoRef,
	scrollRestoration,
} from 'react-flow-app';
import { describe, it } from 'vitest';
import { createFakeBrowser } from './helpers/fake-browser';

const loader = () => Promise.resolve({ default: null });
const screen = <const A extends readonly string[]>(name: string, actions: A) =>
	defineScreen({ name, actions, meta: { title: name }, loader });

const a = screen('a', ['next', 'skip', 'noop', 'fn', 'back2a', 'toOther']);
const b = screen('b', ['next', 'back2a', 'toOther']);
const c = screen('c', ['next', 'fn']);
const d = screen('d', ['next']);
const x = screen('x', ['next', 'done']);
const y = screen('y', ['done']);

/** The flows of these scenarios are not in the example app's `Register`: the typed `goto` does not know them. */
const to = (flow: string, step?: string): GotoRef => (step ? { kind: 'goto', flow, step } : { kind: 'goto', flow }) as GotoRef;

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

describe('parity · basic navigation', () => {
	it('C01 [same] without initial, starts at the first declared step', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		assert.equal(run([f], { flow: 'f' }).at(), 'f.a');
	});

	it('C02 [same] initial in the step definition', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b, initial: true } } });
		assert.equal(run([f], { flow: 'f' }).at(), 'f.b');
	});

	it('C03 [same] an explicit start step wins over initial', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b, initial: true }, c: { screen: c } } });
		assert.equal(run([f], { flow: 'f', step: 'c' }).at(), 'f.c');
	});

	it('C04 [same] a string target navigates and keeps the previous step', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b }, c: { screen: c } } });
		f.transitions({ a: { next: 'b', skip: 'c' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('skip');
		assert.equal(t.at(), 'f.c');
		assert.deepEqual(t.history(), ['a']);
	});

	it('C05 [diverges] an action without a transition does not navigate, and v3 emits action:unhandled (v2 emits nothing)', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('noop');
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.events, ['action:unhandled@f.a']);
	});

	it('C06 [same] back returns to the previous step and removes it from the history', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b }, c: { screen: c } } });
		f.transitions({ a: { next: 'b' }, b: { next: 'c' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		t.engine.back();
		assert.equal(t.at(), 'f.b');
		assert.deepEqual(t.history(), ['a']);
	});

	it('C07 [diverges] back on the first step does not navigate, and v3 emits back:empty (v2 emits nothing)', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a } } });
		const t = run([f], { flow: 'f' });
		t.engine.back();
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.events, ['back:empty@f.a']);
	});

	it('C08 [equivalent] a function without a return value → effect(): runs and stays on the step', () => {
		let calls = 0;
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { fn: effect(() => calls++) } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('fn');
		assert.equal(calls, 1);
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.events, ['action:fn@f.a']);
	});

	it('C09 [equivalent] a function returning navigateTo of the same flow → a string target', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b }, c: { screen: c } } });
		f.transitions({ a: { fn: 'c' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('fn');
		assert.equal(t.at(), 'f.c');
		assert.deepEqual(t.history(), ['a']);
	});

	it('C10 [equivalent] hasPreviousStep → history.length; getLastAction → direction of step:enter', () => {
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

describe('parity · history', () => {
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

	it('H01 [same] ignoreHistory: when leaving the step, it is not kept in the history', () => {
		const t = run([linear({ b: { ignoreHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		assert.deepEqual(t.history(), ['a']);
		t.engine.back();
		assert.equal(t.at(), 'f.a');
	});

	it('H02 [same] back from an ignoreHistory step returns to the previous one', () => {
		const t = run([linear({ b: { ignoreHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.back();
		assert.equal(t.at(), 'f.a');
	});

	it('H03 [same] clearHistory: on arrival the history is cleared and back does not navigate', () => {
		const t = run([linear({ c: { clearHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		assert.deepEqual(t.history(), []);
		t.engine.back();
		assert.equal(t.at(), 'f.c');
	});

	it('H04 [same] after a clearHistory step, only that step is in the history', () => {
		const t = run([linear({ b: { clearHistory: true } })], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		assert.deepEqual(t.history(), ['b']);
		t.engine.back();
		assert.equal(t.at(), 'f.b');
	});

	it('H05 [equivalent] a cycle without allowCyclicHistory: back does not navigate (v2 keeps ["a"], v3 keeps [])', () => {
		const cyclic = defineFlow({ name: 'g', steps: { a: { screen: a }, b: { screen: b }, c: { screen: d } } });
		cyclic.transitions({ a: { next: 'b' }, b: { next: 'c' }, c: { next: 'a' } });
		const t = run([cyclic], { flow: 'g' });
		for (let i = 0; i < 9; i++) t.engine.dispatch('next');
		assert.equal(t.at(), 'g.a');
		// v2: history === ['a'] (the current step shows up in its own history); back does not navigate either.
		assert.deepEqual(t.history(), []);
		t.engine.back();
		assert.equal(t.at(), 'g.a');
	});

	it('H06 [same] allowCyclicHistory on one step of the cycle is not enough: every repeated step needs it', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a, allowCyclicHistory: true }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' }, b: { back2a: 'a' } });
		const t = run([f], { flow: 'f' });
		for (let i = 0; i < 3; i++) {
			t.engine.dispatch('next');
			t.engine.dispatch('back2a');
		}
		assert.deepEqual(t.history(), ['a', 'b']);
	});

	it('H07 [same] allowCyclicHistory on every step of the cycle: the history grows', () => {
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

	it('H08 [same] dispatch with ignoreHistory does not keep the current step', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next', undefined, { ignoreHistory: true });
		assert.deepEqual(t.history(), ['a']);
	});

	it('H09 [equivalent] navigateTo with history → start(flow, step, { history }) (not from a transition)', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.start('f' as never, 'd' as never, { history: ['b', 'c'] });
		assert.equal(t.at(), 'f.d');
		assert.deepEqual(t.history(), ['b', 'c']);
		t.engine.back();
		assert.equal(t.at(), 'f.c');
	});

	it('H10 [equivalent] navigateTo with clearHistory → start(flow, step, { clearHistory })', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.dispatch('next');
		t.engine.start('f' as never, 'a' as never, { clearHistory: true });
		assert.equal(t.at(), 'f.a');
		assert.deepEqual(t.history(), []);
	});

	it('H11 [same] initialHistory allows back from the first screen', () => {
		const t = run([linear()], { flow: 'f', step: 'c', history: ['a', 'b'] });
		assert.deepEqual(t.history(), ['a', 'b']);
		t.engine.back();
		assert.equal(t.at(), 'f.b');
	});

	it('H12 [same] clearHistory() clears the history', () => {
		const t = run([linear()], { flow: 'f' });
		t.engine.dispatch('next');
		t.engine.clearHistory();
		assert.deepEqual(t.history(), []);
	});
});

describe('parity · across flows', () => {
	const flows = () => {
		const main = defineFlow({ name: 'main', steps: { a: { screen: a }, b: { screen: b } } });
		const other = defineFlow({ name: 'other', steps: { x: { screen: x }, y: { screen: y } } });
		return { main, other };
	};

	it('X01 [equivalent] navigateTo of another flow → goto', () => {
		const { main, other } = flows();
		main.transitions({ a: { toOther: to('other', 'y') } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('toOther');
		assert.equal(t.at(), 'other.y');
	});

	it('X02 [same] back on the first step of the other flow returns to the calling step', () => {
		const { main, other } = flows();
		main.transitions({ a: { next: 'b' }, b: { toOther: to('other', 'x') } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('next');
		t.engine.dispatch('toOther');
		t.engine.back();
		assert.equal(t.at(), 'main.b');
	});

	it('X03 [same] back inside the other flow uses that flow history first', () => {
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

	it('X04 [equivalent] backExit → flow:exit(back) on the flow being left', () => {
		const { main, other } = flows();
		main.transitions({ a: { toOther: to('other', 'x') } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('toOther');
		t.events.length = 0;
		t.engine.back();
		assert.ok(t.events.includes('flow:exit(back)@other.x'));
	});

	it('X05 [same] start of another flow, then back returns to the previous flow', () => {
		const { main, other } = flows();
		const t = run([main, other], { flow: 'main' });
		t.engine.start('other' as never, 'y' as never);
		assert.equal(t.at(), 'other.y');
		t.engine.back();
		assert.equal(t.at(), 'main.a');
	});

	it('X06 [same] start with clearHistory forgets the calling flow', () => {
		const { main, other } = flows();
		const t = run([main, other], { flow: 'main' });
		t.engine.start('other' as never, 'x' as never, { clearHistory: true });
		t.engine.back();
		assert.equal(t.at(), 'other.x');
		assert.deepEqual(t.history(), []);
	});

	it('X07 [equivalent] navigateTo() without a step → goto(flow) without a step: resumes the flow where it was', () => {
		const { main, other } = flows();
		main.transitions({ a: { next: 'b' }, b: { toOther: to('other', 'x') } });
		other.transitions({ x: { done: to('main') } });
		const t = run([main, other], { flow: 'main' });
		t.engine.dispatch('next');
		t.engine.dispatch('toOther');
		t.engine.dispatch('done');
		assert.equal(t.at(), 'main.b');
	});

	const withOverlay = () => {
		const modal = screen('modal', ['restart']);
		const main = defineFlow({ name: 'main', steps: { a: { screen: a }, b: { screen: b } }, overlays: { modal } });
		main.transitions({ a: { next: 'b' }, modal: { restart: 'a' } });
		return main;
	};

	it('X08 [diverges] an overlay works without extra configuration (in v2 an anotherObject without `name` was ignored: a bug)', () => {
		const t = run([withOverlay()], { flow: 'main' });
		t.engine.dispatch('next');
		t.engine.dispatch('restart', undefined, { from: 'modal' });
		assert.equal(t.at(), 'main.a');
	});

	it('X09 [equivalent] anotherObjects → overlays: a dispatch from the overlay uses the overlay transitions', () => {
		const t = run([withOverlay()], { flow: 'main' });
		t.engine.dispatch('next');
		t.events.length = 0;
		t.engine.dispatch('restart', undefined, { from: 'modal' });
		assert.deepEqual(t.events, ['action:restart@main.b', 'step:leave(dispatch)@main.b', 'step:enter@main.a']);
		// Without `from`, the action is looked up on the current step (which does not declare it).
		t.engine.dispatch('restart');
		assert.equal(t.events[t.events.length - 1], 'action:unhandled@main.a');
	});
});

describe('parity · events', () => {
	it('E01 [equivalent] initial mount → flow:start + step:enter', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a } } });
		const engine = createFlowEngine(createFlowApp([f]));
		const events: string[] = [];
		engine.on('*', (event: FlowEvent) => events.push(`${event.type}@${event.flow}.${event.step}`));
		engine.start('f' as never);
		assert.deepEqual(events, ['flow:start@f.a', 'step:enter@f.a']);
	});

	it('E02 [equivalent] dispatch → mount becomes action → step:leave → step:enter', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('next');
		assert.deepEqual(t.events, ['action:next@f.a', 'step:leave(dispatch)@f.a', 'step:enter@f.b']);
	});

	it('E03 [same] the dispatch payload reaches the listeners', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		const payloads: unknown[] = [];
		t.engine.on('action', event => payloads.push(event.payload));
		t.engine.dispatch('next', { orderId: 42 });
		assert.deepEqual(payloads, [{ orderId: 42 }]);
	});

	it('E04 [equivalent] back → mount becomes step:leave(back) → step:enter(direction: back)', () => {
		const f = defineFlow({ name: 'f', steps: { a: { screen: a }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const t = run([f], { flow: 'f' });
		t.engine.dispatch('next');
		t.events.length = 0;
		t.engine.back();
		assert.deepEqual(t.events, ['step:leave(back)@f.b', 'step:enter@f.a']);
	});

	it('E05 [same] the event url is /baseUrl/step-url (or the step name)', () => {
		const f = defineFlow({ name: 'f', baseUrl: '/shop/', steps: { a: { screen: a, url: 'start' }, b: { screen: b } } });
		f.transitions({ a: { next: 'b' } });
		const engine = createFlowEngine(createFlowApp([f]));
		const urls: string[] = [];
		engine.on('*', (event: FlowEvent) => {
			if (event.type === 'step:enter' || event.type === 'action') urls.push(event.url);
		});
		engine.start('f' as never);
		engine.dispatch('next');
		// v2 (mount, dispatch, mount): ['/shop/start', '/shop/start', '/shop/b']
		assert.deepEqual(urls, ['/shop/start', '/shop/start', '/shop/b']);
	});

	it('E06 [equivalent] the Provider listen → app integrations (every flow)', () => {
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

	it('E07 [equivalent] onFlowMount/onFlowUnmount → flow:start / flow:exit(goto)', () => {
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

describe('parity · URL', () => {
	const shop = () => {
		const f = defineFlow({ name: 'f', baseUrl: 'shop', steps: { a: { screen: a }, b: { screen: b, url: 'pay' } } });
		f.transitions({ a: { next: 'b' } });
		return createFlowApp([f]);
	};

	it('U01 [diverges] writes #/baseUrl/step, but with pushState: the browser back button works (v2 only used replaceState)', () => {
		const fake = createFakeBrowser();
		const engine = createFlowEngine(shop(), { initial: { flow: 'f' } as never });
		browserHistory({ browser: fake.browser }).attach(engine as never);

		engine.dispatch('next');

		assert.equal(fake.url(), '/#/shop/pay');
		assert.deepEqual(fake.calls, ['replace', 'push']);
	});

	it('U02 [same] without a URL adapter, the engine does not touch the browser', () => {
		const fake = createFakeBrowser({ hash: '#/unchanged' });
		const engine = createFlowEngine(shop(), { initial: { flow: 'f' } as never });

		engine.dispatch('next');

		assert.equal(fake.url(), '/#/unchanged');
		assert.deepEqual(fake.calls, []);
	});

	it('U03 [equivalent] scrollRestoration restores the position on back once the screen is mounted (v2 waited a fixed 300 ms)', () => {
		let scroll = 0;
		const writes: number[] = [];
		const adapter = scrollRestoration({ get: () => scroll, set: top => writes.push((scroll = top)) });
		const engine = createFlowEngine(shop(), { initial: { flow: 'f' } as never });
		adapter.attach(engine as never);

		scroll = 640;
		engine.dispatch('next');
		engine.back();
		adapter.screenReady?.();

		assert.equal(writes[writes.length - 1], 640);
	});
});
