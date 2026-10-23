'use client';

import { browserHistory } from 'react-flow-app';
import { FlowProvider } from 'react-flow-app/react';
import { flowApp } from '../../examples/store/app.flow';

// app/layout.tsx or a page renders <AppFlows />: the Provider must live in a client component.
export function AppFlows() {
	// On the server there is no window: the adapter skips the deep link and the first render
	// is the initial step. Lazy screens show the fallback until they load on the client.
	return <FlowProvider app={flowApp} initial={{ flow: 'home' }} adapters={[browserHistory()]} fallback={<p>Loading…</p>} />;
}
