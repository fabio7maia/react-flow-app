import { browserHistory, type FlowAdapter, scrollRestoration } from 'react-flow-app';
import { FlowProvider, useFlowEvents } from 'react-flow-app/react';
import { appAnalytics } from './analytics';
import { flowApp } from './app.flow';

/** A child of the Provider that reacts to events: the document title follows the step. */
function DocumentTitle() {
	useFlowEvents('step:enter', event => {
		document.title = `${event.meta?.title ?? event.step} · Store`;
	});
	return null;
}

export const defaultAdapters = (): FlowAdapter[] => [browserHistory(), scrollRestoration(), appAnalytics()];

export function App({ adapters = defaultAdapters() }: { adapters?: FlowAdapter[] }) {
	return (
		<FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={adapters} fallback={<p>Loading…</p>}>
			<DocumentTitle />
		</FlowProvider>
	);
}
