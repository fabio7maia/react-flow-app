import { createRoot } from 'react-dom/client';
import { App } from './App';

// Analytics de exemplo: regista as chamadas em window.__analytics (lidas pelos testes e2e).
const calls: string[] = [];
Object.assign(window, { __analytics: calls });
Object.assign(globalThis, {
	analytics: {
		page: (title: string) => calls.push(`page ${title}`),
		track: (name: string) => calls.push(`track ${name}`),
	},
});

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
