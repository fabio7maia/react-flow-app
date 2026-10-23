import type { Meta, StoryObj } from '@storybook/react';
import type { ReactElement } from 'react';
import { createFlowApp, defineFlow, defineScreen } from 'react-flow-app';
import { useFlow } from 'react-flow-app/react';
import { Playground, ScreenCard } from '../support/Playground';

// Screens: each one declares its actions; the component only dispatches them.
const personalScreen = defineScreen({
	name: 'personal',
	actions: ['next'],
	meta: { title: 'Personal details' },
	loader: async () => ({ default: Personal }),
});
const addressScreen = defineScreen({
	name: 'address',
	actions: ['next'],
	meta: { title: 'Address' },
	loader: async () => ({ default: Address }),
});
const confirmScreen = defineScreen({
	name: 'confirm',
	actions: ['submit', 'edit'],
	meta: { title: 'Confirm' },
	loader: async () => ({ default: Confirm }),
});
const doneScreen = defineScreen({ name: 'done', actions: ['restart'], meta: { title: 'Done' }, loader: async () => ({ default: Done }) });

function Personal(): ReactElement {
	const { dispatch } = useFlow(personalScreen);
	return (
		<ScreenCard title="Personal details" text="Step 1 of 3">
			<button onClick={() => dispatch('next')}>Continue</button>
		</ScreenCard>
	);
}

function Address(): ReactElement {
	const { dispatch, back } = useFlow(addressScreen);
	return (
		<ScreenCard title="Address" text="Step 2 of 3">
			<button onClick={() => dispatch('next')}>Continue</button>
			<button onClick={back}>Back</button>
		</ScreenCard>
	);
}

function Confirm(): ReactElement {
	const { dispatch, back } = useFlow(confirmScreen);
	return (
		<ScreenCard title="Confirm" text="Step 3 of 3">
			<button onClick={() => dispatch('submit')}>Submit</button>
			<button onClick={() => dispatch('edit')}>Edit details</button>
			<button onClick={back}>Back</button>
		</ScreenCard>
	);
}

function Done(): ReactElement {
	const { dispatch } = useFlow(doneScreen);
	return (
		<ScreenCard title="Done" text="The history was cleared: back has nowhere to go.">
			<button onClick={() => dispatch('restart')}>Start again</button>
		</ScreenCard>
	);
}

// The flow: steps and where each action goes. Navigation lives here, not in the screens.
const signupFlow = defineFlow({
	name: 'signup',
	steps: {
		personal: { screen: personalScreen, initial: true },
		address: { screen: addressScreen },
		confirm: { screen: confirmScreen },
		done: { screen: doneScreen, clearHistory: true },
	},
});

signupFlow.transitions({
	personal: { next: 'address' },
	address: { next: 'confirm' },
	confirm: { submit: 'done', edit: 'personal' },
	done: { restart: 'personal' },
});

const app = createFlowApp([signupFlow]);

const meta: Meta = {
	title: 'Examples/Basic flow',
	parameters: {
		docs: {
			description: {
				component:
					'A three-step wizard. Screens dispatch actions (`next`, `submit`, `edit`); the flow maps each action of each step to a target. `done` has `clearHistory`, so back has nowhere to go after submitting.',
			},
		},
	},
};
export default meta;

export const Wizard: StoryObj = {
	render: () => (
		<Playground
			app={app}
			initial={{ flow: 'signup' }}
			hints={
				<ul>
					<li>
						Continue twice, then Edit details: back to the first step, and the history is cut (no cycles without
						allowCyclicHistory).
					</li>
					<li>Submit: the history is cleared; engine.back() emits back:empty.</li>
				</ul>
			}
		/>
	),
};
