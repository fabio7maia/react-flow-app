import type { Meta, StoryObj } from '@storybook/react';
import type { ReactElement } from 'react';
import { createFlowApp, defineFlow, defineScreen } from 'react-flow-app';
import { useFlow } from 'react-flow-app/react';
import { Playground, ScreenCard } from '../support/Playground';

const searchScreen = defineScreen({
	name: 'search',
	actions: ['open'],
	meta: { title: 'Search' },
	loader: async () => ({ default: Search }),
});
const resultScreen = defineScreen({
	name: 'result',
	actions: ['open', 'buy'],
	meta: { title: 'Result' },
	loader: async () => ({ default: Result }),
});
const errorScreen = defineScreen({
	name: 'error',
	actions: ['retry'],
	meta: { title: 'Error' },
	loader: async () => ({ default: ErrorStep }),
});
const receiptScreen = defineScreen({
	name: 'receipt',
	actions: ['again'],
	meta: { title: 'Receipt' },
	loader: async () => ({ default: Receipt }),
});

function Search(): ReactElement {
	const { dispatch } = useFlow(searchScreen);
	return (
		<ScreenCard title="Search">
			<button onClick={() => dispatch('open')}>Open a result</button>
		</ScreenCard>
	);
}

function Result(): ReactElement {
	const { dispatch, back } = useFlow(resultScreen);
	return (
		<ScreenCard title="Result" text="Related results open another result.">
			<button onClick={() => dispatch('open')}>Open a related result</button>
			<button onClick={() => dispatch('buy')}>Buy</button>
			<button onClick={back}>Back</button>
		</ScreenCard>
	);
}

function ErrorStep(): ReactElement {
	const { dispatch, back } = useFlow(errorScreen);
	return (
		<ScreenCard title="Payment error" text="ignoreHistory: this step is not kept when leaving it.">
			<button onClick={() => dispatch('retry')}>Retry</button>
			<button onClick={back}>Back</button>
		</ScreenCard>
	);
}

function Receipt(): ReactElement {
	const { dispatch } = useFlow(receiptScreen);
	return (
		<ScreenCard title="Receipt" text="clearHistory: back has nowhere to go.">
			<button onClick={() => dispatch('again')}>Search again</button>
		</ScreenCard>
	);
}

const shopFor = (name: string, cyclic: boolean) => {
	const flow = defineFlow({
		name,
		steps: {
			search: { screen: searchScreen, initial: true },
			result: { screen: resultScreen, allowCyclicHistory: cyclic },
			error: { screen: errorScreen, ignoreHistory: true },
			receipt: { screen: receiptScreen, clearHistory: true },
		},
	});
	flow.transitions({
		search: { open: 'result' },
		// `result` opens another `result`: with allowCyclicHistory each one stays in the history.
		result: { open: 'result', buy: 'error' },
		error: { retry: 'receipt' },
		receipt: { again: 'search' },
	});
	return createFlowApp([flow]);
};

const meta: Meta = {
	title: 'Examples/History options',
	parameters: {
		docs: {
			description: {
				component:
					'The v2 history rules, unchanged: `ignoreHistory` (the step is not kept when leaving it), `clearHistory` (entering the step clears the history) and `allowCyclicHistory` (a step can appear more than once).',
			},
		},
	},
};
export default meta;

const hints = (
	<ul>
		<li>Open a result, then open related results a few times and watch the history.</li>
		<li>Buy: on the error step, Back returns to the result, and the error step never shows up in the history.</li>
		<li>Retry reaches the receipt: the history is cleared and engine.back() emits back:empty.</li>
	</ul>
);

export const WithoutCycles: StoryObj = {
	name: 'Without allowCyclicHistory',
	render: () => <Playground app={shopFor('shop', false)} initial={{ flow: 'shop' }} hints={hints} />,
};

export const WithCycles: StoryObj = {
	name: 'With allowCyclicHistory',
	render: () => <Playground app={shopFor('shopCyclic', true)} initial={{ flow: 'shopCyclic' }} hints={hints} />,
};
