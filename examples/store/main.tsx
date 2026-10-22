import { createRoot } from 'react-dom/client';
import { App } from './App';

// Example analytics: records the calls in window.__analytics (read by the e2e tests).
const calls: string[] = [];
Object.assign(window, { __analytics: calls });
Object.assign(globalThis, {
	analytics: {
		page: (name: string, properties: { path: string }) => calls.push(`page ${name} ${properties.path}`),
		track: (name: string) => calls.push(`track ${name}`),
	},
});

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
