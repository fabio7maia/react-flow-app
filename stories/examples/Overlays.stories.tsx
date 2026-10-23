import type { Meta, StoryObj } from '@storybook/react';
import { type ReactElement, useState } from 'react';
import { createFlowApp, defineFlow, defineScreen, effect } from 'react-flow-app';
import { useFlow } from 'react-flow-app/react';
import { Playground, ScreenCard } from '../support/Playground';

const inboxScreen = defineScreen({ name: 'inbox', actions: ['open'], meta: { title: 'Inbox' }, loader: async () => ({ default: Inbox }) });
const messageScreen = defineScreen({
	name: 'message',
	actions: ['reply'],
	meta: { title: 'Message' },
	loader: async () => ({ default: Message }),
});
const composeScreen = defineScreen({
	name: 'compose',
	actions: ['send'],
	meta: { title: 'Compose' },
	loader: async () => ({ default: Compose }),
});
// An overlay: a screen that is not a step (here a help panel), but whose actions navigate the flow.
const helpScreen = defineScreen({
	name: 'help',
	actions: ['goToInbox', 'close'],
	meta: { title: 'Help' },
	loader: async () => ({ default: Help }),
});

function Inbox(): ReactElement {
	const { dispatch } = useFlow(inboxScreen);
	return (
		<ScreenCard title="Inbox">
			<button onClick={() => dispatch('open')}>Open a message</button>
		</ScreenCard>
	);
}

function Message(): ReactElement {
	const { dispatch, back } = useFlow(messageScreen);
	const [help, setHelp] = useState(false);
	return (
		<ScreenCard title="Message">
			<button onClick={() => dispatch('reply')}>Reply</button>
			<button onClick={() => setHelp(true)}>Help</button>
			<button onClick={back}>Back</button>
			{help && <HelpPanel onClose={() => setHelp(false)} />}
		</ScreenCard>
	);
}

function Compose(): ReactElement {
	const { dispatch, back } = useFlow(composeScreen);
	return (
		<ScreenCard title="Compose">
			<button onClick={() => dispatch('send')}>Send</button>
			<button onClick={back}>Back</button>
		</ScreenCard>
	);
}

function HelpPanel({ onClose }: { onClose: () => void }): ReactElement {
	// useFlow(helpScreen): the dispatch says it comes from the overlay, so the overlay's transitions apply.
	const { dispatch } = useFlow(helpScreen);
	return (
		<div className="pg-modal" role="dialog" aria-label="Help">
			<strong>Help</strong>
			<p className="muted">The help panel is an overlay of the flow: its actions have their own transitions.</p>
			<button onClick={() => dispatch('goToInbox')}>Go to the inbox</button>
			<button
				onClick={() => {
					dispatch('close');
					onClose();
				}}
			>
				Close
			</button>
		</div>
	);
}

/** The default export the loader expects (the overlay is rendered by the step screen, not by the Provider). */
function Help(): ReactElement {
	return <HelpPanel onClose={() => undefined} />;
}

const mailFlow = defineFlow({
	name: 'mail',
	steps: {
		inbox: { screen: inboxScreen, initial: true },
		message: { screen: messageScreen },
		compose: { screen: composeScreen },
	},
	overlays: { help: helpScreen },
});

mailFlow.transitions({
	inbox: { open: 'message' },
	message: { reply: 'compose' },
	compose: { send: 'inbox' },
	help: { goToInbox: 'inbox', close: effect(() => undefined) },
});

const app = createFlowApp([mailFlow]);

const meta: Meta = {
	title: 'Examples/Overlays',
	parameters: {
		docs: {
			description: {
				component:
					'Overlays (v2: `anotherObjects`) are modals or panels whose actions navigate the flow. They are nodes of the graph and are validated, but they are not steps: they never enter the history.',
			},
		},
	},
};
export default meta;

export const HelpPanelOverlay: StoryObj = {
	name: 'Help panel',
	render: () => (
		<Playground
			app={app}
			initial={{ flow: 'mail' }}
			hints={
				<p>
					Open a message, open Help, then Go to the inbox: the action comes from the overlay (the {'{{@help}}'} node on the map).
				</p>
			}
		/>
	),
};
