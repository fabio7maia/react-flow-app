import { FlowProvider, useFlowEvents } from 'react-flow-app';
import { flowApp } from './app.flow';

declare const analytics: { page(title: string): void; track(name: string, data?: object): void };

function Analytics() {
	useFlowEvents('step:enter', event => analytics.page(event.meta?.title ?? event.step));
	useFlowEvents('action', event => {
		if (event.action === 'checkout') {
			analytics.track('checkout', { loggedIn: event.payload.loggedIn });
		}
	});
	return null;
}

export function App() {
	return (
		<>
			<FlowProvider app={flowApp} initial={{ flow: 'home' }} fallback={<p>A carregar…</p>} />
			<Analytics />
		</>
	);
}
