import { browserHistory, type FlowAdapter, FlowProvider, scrollRestoration, useFlowEvents } from 'react-flow-app';
import { flowApp } from './app.flow';

declare const analytics: { page(title: string): void; track(name: string, data?: object): void };

/** Integração com analytics num único sítio, tipada para todos os flows. */
function Analytics() {
	useFlowEvents('step:enter', event => analytics.page(event.meta?.title ?? event.step));
	useFlowEvents('action', event => {
		if (event.action === 'checkout') {
			analytics.track('checkout', { loggedIn: event.payload.loggedIn });
		}
	});
	return null;
}

export function App({ adapters = [browserHistory(), scrollRestoration()] }: { adapters?: FlowAdapter[] }) {
	return (
		<FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={adapters} fallback={<p>A carregar…</p>}>
			<Analytics />
		</FlowProvider>
	);
}
