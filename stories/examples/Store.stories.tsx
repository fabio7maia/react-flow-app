import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { segment } from 'react-flow-app/analytics';
import { flowApp } from '../../examples/store/app.flow';
import { Playground } from '../support/Playground';

const meta: Meta = {
	title: 'Examples/Store',
	parameters: {
		docs: {
			description: {
				component:
					'The example store of the repo (`examples/store`): three flows in separate files, `goto` between flows, `goto.exit()`, a branch, URL params and the history options. The screens are lazy loaded.',
			},
		},
	},
};
export default meta;

export const AcrossFlows: StoryObj = {
	name: 'Across flows',
	render: () => (
		<Playground
			app={flowApp}
			initial={{ flow: 'home' }}
			hints={
				<ul>
					<li>View cart → Log in and buy: goto to the auth flow (flow:exit, flow:start).</li>
					<li>Log in: goto.exit() returns to the cart, the step that opened the auth flow.</li>
					<li>Checkout → Simulate failure → Try again: the payment keeps its orderId param.</li>
				</ul>
			}
		/>
	),
};

type Call = { method: 'page' | 'track'; name: string; properties?: Record<string, unknown> };

function WithAnalytics() {
	const [calls, setCalls] = useState<Call[]>([]);
	const [adapters] = useState(() => [
		segment({
			client: () => ({
				page: (name, properties) => setCalls(list => [...list, { method: 'page', name, properties: { path: properties?.path } }]),
				track: (name, properties) => setCalls(list => [...list, { method: 'track', name, properties }]),
			}),
			actions: {
				checkout: payload => ({ name: 'Checkout Started', properties: { loggedIn: payload.loggedIn } }),
				pay: payload => ({ name: 'Payment Submitted', properties: { ok: payload.ok } }),
				finish: 'Order Completed',
			},
		}),
	]);

	return (
		<Playground
			app={flowApp}
			initial={{ flow: 'home' }}
			adapters={adapters}
			hints={<p>Every page view, funnel event and listed action, as the Segment adapter sends them.</p>}
			aside={
				<div className="pg-aside">
					<strong>Segment calls</strong>
					<ol>
						{calls.map((call, index) => (
							<li key={index}>
								{call.method}('{call.name}'{call.properties ? `, ${JSON.stringify(call.properties)}` : ''})
							</li>
						))}
					</ol>
				</div>
			}
		/>
	);
}

export const Analytics: StoryObj = {
	render: () => <WithAnalytics />,
};
