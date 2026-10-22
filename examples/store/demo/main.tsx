import { createRoot } from 'react-dom/client';
import { devtools } from './devtools';
import { Demo } from './Demo';

// Fake Segment client: the `segment()` adapter resolves `window.analytics` on every call.
Object.assign(globalThis, {
	analytics: {
		page: (name: string, properties?: Record<string, unknown>) => devtools.analytics('page', name, properties),
		track: (name: string, properties?: Record<string, unknown>) => devtools.analytics('track', name, properties),
	},
});

createRoot(document.getElementById('demo') as HTMLElement).render(<Demo />);
