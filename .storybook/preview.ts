import type { Preview } from '@storybook/react';
import '../examples/store/demo/demo.css';
import '../stories/support/playground.css';

const preview: Preview = {
	parameters: {
		layout: 'padded',
		options: { storySort: { order: ['Introduction', 'Demo', 'Examples'] } },
	},
};

export default preview;
