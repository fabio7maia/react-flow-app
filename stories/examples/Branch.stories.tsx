import type { Meta, StoryObj } from '@storybook/react';
import type { ReactElement } from 'react';
import { branch, createFlowApp, defineFlow, defineScreen, payload } from 'react-flow-app';
import { useFlow } from 'react-flow-app/react';
import { Playground, ScreenCard } from '../support/Playground';

const questionScreen = defineScreen({
	name: 'question',
	actions: { answer: payload<{ correct: boolean }>() },
	meta: { title: 'Question' },
	loader: async () => ({ default: Question }),
});
const rightScreen = defineScreen({ name: 'right', actions: ['next'], meta: { title: 'Right' }, loader: async () => ({ default: Right }) });
const wrongScreen = defineScreen({ name: 'wrong', actions: ['retry'], meta: { title: 'Wrong' }, loader: async () => ({ default: Wrong }) });

function Question(): ReactElement {
	const { dispatch } = useFlow(questionScreen);
	return (
		<ScreenCard title="What is 6 × 7?">
			<button onClick={() => dispatch('answer', { correct: true })}>42</button>
			<button onClick={() => dispatch('answer', { correct: false })}>48</button>
		</ScreenCard>
	);
}

function Right(): ReactElement {
	const { dispatch } = useFlow(rightScreen);
	return (
		<ScreenCard title="Right!">
			<button onClick={() => dispatch('next')}>Next question</button>
		</ScreenCard>
	);
}

function Wrong(): ReactElement {
	const { dispatch } = useFlow(wrongScreen);
	return (
		<ScreenCard title="Not quite">
			<button onClick={() => dispatch('retry')}>Try again</button>
		</ScreenCard>
	);
}

const quizFlow = defineFlow({
	name: 'quiz',
	steps: {
		question: { screen: questionScreen, initial: true },
		right: { screen: rightScreen },
		wrong: { screen: wrongScreen, ignoreHistory: true },
	},
});

quizFlow.transitions({
	question: {
		// Every possible target is declared: the diagram shows both edges without running the resolver.
		// `p` is typed from the action payload; `samples` let the generated tests walk each branch.
		answer: branch(['right', 'wrong'], (_, p) => (p.correct ? 'right' : 'wrong'), {
			samples: { right: { correct: true }, wrong: { correct: false } },
		}),
	},
	right: { next: 'question' },
	wrong: { retry: 'question' },
});

const app = createFlowApp([quizFlow]);

const meta: Meta = {
	title: 'Examples/Branch',
	parameters: {
		docs: {
			description: {
				component:
					'`branch(targets, resolve, { samples })` chooses a target from the payload. The targets are data, so the diagram, the validation and the generated tests know every path without running your code.',
			},
		},
	},
};
export default meta;

export const Quiz: StoryObj = {
	render: () => (
		<Playground app={app} initial={{ flow: 'quiz' }} hints={<p>Answer both ways and watch both branch edges light up on the map.</p>} />
	),
};
