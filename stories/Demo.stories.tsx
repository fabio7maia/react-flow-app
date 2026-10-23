import type { Meta, StoryObj } from '@storybook/react';
import { Demo } from '../examples/store/demo/Demo';

const meta: Meta = {
	title: 'Demo/Inside the store',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'The interactive demo: the store in a simulated browser (address bar, back/forward, reload), the live map of the flows, the event contract, the analytics calls, the generated tests, a PR review diff and the source of the current step.',
			},
		},
	},
};
export default meta;

export const InsideTheStore: StoryObj = {
	name: 'Inside the store',
	render: () => <Demo />,
};
