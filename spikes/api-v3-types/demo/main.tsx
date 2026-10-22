import { createRoot } from 'react-dom/client';
import { devtools } from './devtools';
import { Demo } from './Demo';

// Cliente Segment falso: o adaptador `segment()` resolve `window.analytics` em cada chamada.
Object.assign(globalThis, {
	analytics: {
		page: (name: string, properties?: Record<string, unknown>) => devtools.analytics('page', name, properties),
		track: (name: string, properties?: Record<string, unknown>) => devtools.analytics('track', name, properties),
	},
});

createRoot(document.getElementById('demo') as HTMLElement).render(<Demo />);
