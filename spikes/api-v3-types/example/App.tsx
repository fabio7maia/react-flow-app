import { browserHistory, type FlowAdapter, FlowProvider, scrollRestoration, useFlowEvents } from 'react-flow-app';
import { appAnalytics } from './analytics';
import { flowApp } from './app.flow';

/** Um filho do Provider que reage a eventos: o título do documento segue o passo. */
function DocumentTitle() {
	useFlowEvents('step:enter', event => {
		document.title = `${event.meta?.title ?? event.step} · Loja`;
	});
	return null;
}

export const defaultAdapters = (): FlowAdapter[] => [browserHistory(), scrollRestoration(), appAnalytics()];

export function App({ adapters = defaultAdapters() }: { adapters?: FlowAdapter[] }) {
	return (
		<FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={adapters} fallback={<p>A carregar…</p>}>
			<DocumentTitle />
		</FlowProvider>
	);
}
