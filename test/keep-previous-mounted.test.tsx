// @vitest-environment jsdom
/**
 * Parity with v2.20 (`keepPreviousMounted`, not covered by the 2.18 characterization): the previous
 * step stays mounted (hidden) while a step with the option is active, and back shows it again
 * without remounting it.
 */
import assert from 'node:assert/strict';
import { act, type ReactElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createFlowApp, defineFlow, defineScreen } from 'react-flow-app';
import { FlowProvider, useFlow, useStepParams } from 'react-flow-app/react';
import { afterEach, beforeAll, describe, it } from 'vitest';

beforeAll(() => {
	Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const mounts: string[] = [];

const listScreen = defineScreen({ name: 'list', actions: ['open'], meta: { title: 'List' }, loader: async () => ({ default: List }) });
const detailScreen = defineScreen({
	name: 'detail',
	actions: ['more', 'leave'],
	meta: { title: 'Detail' },
	loader: async () => ({ default: Detail }),
});
const moreScreen = defineScreen({ name: 'more', actions: ['leave'], meta: { title: 'More' }, loader: async () => ({ default: More }) });
const otherScreen = defineScreen({ name: 'other', actions: [], meta: { title: 'Other' }, loader: async () => ({ default: Other }) });

function useMountLog(name: string): void {
	useEffect(() => {
		mounts.push(`mount ${name}`);
		return () => void mounts.push(`unmount ${name}`);
	}, [name]);
}

function List(): ReactElement {
	useMountLog('list');
	const { dispatch } = useFlow(listScreen);
	const [count, setCount] = useState(0);
	const params = useStepParams('catalog' as never, 'list' as never);
	return (
		<>
			<h1>List</h1>
			<p data-testid="count">Count {count}</p>
			<p data-testid="list-params">{JSON.stringify(params)}</p>
			<button onClick={() => setCount(value => value + 1)}>Increment</button>
			<button onClick={() => dispatch('open', undefined, { params: { id: '7' } })}>Open</button>
		</>
	);
}

function Detail(): ReactElement {
	useMountLog('detail');
	const { dispatch, back } = useFlow(detailScreen);
	return (
		<>
			<h1>Detail</h1>
			<button onClick={() => dispatch('more')}>More</button>
			<button onClick={() => dispatch('leave')}>Leave</button>
			<button onClick={back}>Back</button>
		</>
	);
}

function More(): ReactElement {
	useMountLog('more');
	const { dispatch, back } = useFlow(moreScreen);
	return (
		<>
			<h1>More</h1>
			<button onClick={() => dispatch('leave')}>Leave</button>
			<button onClick={back}>Back</button>
		</>
	);
}

function Other(): ReactElement {
	useMountLog('other');
	const { back } = useFlow(otherScreen);
	return (
		<>
			<h1>Other</h1>
			<button onClick={back}>Back</button>
		</>
	);
}

const catalog = (keep: boolean) => {
	const flow = defineFlow({
		name: 'catalog',
		steps: {
			list: { screen: listScreen, initial: true },
			detail: { screen: detailScreen, url: 'item/:id', keepPreviousMounted: keep },
			more: { screen: moreScreen, keepPreviousMounted: keep },
			other: { screen: otherScreen },
		},
	});
	flow.transitions({ list: { open: 'detail' }, detail: { more: 'more', leave: 'other' }, more: { leave: 'other' } });
	return createFlowApp([flow]);
};

let root: Root;
let container: HTMLElement;

const flush = async (): Promise<void> => {
	for (let i = 0; i < 3; i++) {
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 5));
		});
	}
};

const render = async (keep: boolean): Promise<void> => {
	mounts.length = 0;
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root.render(<FlowProvider app={catalog(keep) as never} initial={{ flow: 'catalog' as never }} />));
	await flush();
};

/** Headings currently visible (hidden kept screens sit under a `display: none` wrapper). */
const visible = (): string[] =>
	[...container.querySelectorAll('h1')].filter(h1 => !h1.closest('[style*="display: none"]')).map(h1 => h1.textContent ?? '');

const click = async (label: string): Promise<void> => {
	const button = [...container.querySelectorAll('button')].find(b => b.textContent === label && !b.closest('[style*="display: none"]'));
	if (!button) throw new Error(`Visible button "${label}" not found: ${container.innerHTML}`);
	await act(async () => {
		button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
	await flush();
};

const text = (id: string): string | null | undefined => container.querySelector(`[data-testid="${id}"]`)?.textContent;

describe('parity · keepPreviousMounted (v2.20)', () => {
	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
	});

	it('K01 [same] the previous step stays mounted and hidden; back shows it again with its state', async () => {
		await render(true);
		await click('Increment');
		await click('Increment');

		await click('Open');

		assert.deepEqual(visible(), ['Detail']);
		assert.equal(container.querySelectorAll('h1').length, 2, 'the list is still in the DOM');
		assert.ok(!mounts.includes('unmount list'));

		await click('Back');

		assert.deepEqual(visible(), ['List']);
		assert.equal(text('count'), 'Count 2');
		assert.deepEqual(mounts, ['mount list', 'mount detail', 'unmount detail']);
	});

	it('K02 [same] consecutive steps with the option stack up; a step without it unmounts them', async () => {
		await render(true);
		await click('Open');
		await click('More');

		assert.deepEqual(visible(), ['More']);
		assert.equal(container.querySelectorAll('h1').length, 3);

		await click('Leave');

		assert.deepEqual(visible(), ['Other']);
		assert.equal(container.querySelectorAll('h1').length, 1);
		assert.ok(mounts.includes('unmount list') && mounts.includes('unmount detail'));
	});

	it('K03 a kept screen reads its own URL params, not those of the current step', async () => {
		await render(true);
		assert.equal(text('list-params'), '{}');

		// The detail is entered with { id: '7' }; the hidden list must not see them.
		await click('Open');

		assert.ok(container.querySelector('[data-flow-step="catalog.detail"]'), 'the current step is wrapped');
		assert.equal(text('list-params'), '{}');
	});

	it('the initial history of the Provider lets back work from the first screen', async () => {
		mounts.length = 0;
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		await act(async () =>
			root.render(
				<FlowProvider app={catalog(false) as never} initial={{ flow: 'catalog' as never, step: 'detail', history: ['list'] }} />
			)
		);
		await flush();
		assert.deepEqual(visible(), ['Detail']);

		await click('Back');

		assert.deepEqual(visible(), ['List']);
	});

	it('without the option, back remounts the previous step (state lost), as before', async () => {
		await render(false);
		await click('Increment');
		await click('Open');

		assert.equal(container.querySelectorAll('h1').length, 1);

		await click('Back');

		assert.equal(text('count'), 'Count 0');
		assert.ok(mounts.includes('unmount list'));
	});
});
