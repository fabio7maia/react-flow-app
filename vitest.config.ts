import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (path: string): string => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^react-flow-app$/, replacement: src('index.ts') },
			{ find: /^react-flow-app\/react$/, replacement: src('react/index.tsx') },
			{ find: /^react-flow-app\/(analytics|testing)$/, replacement: src('$1/index.ts') },
		],
	},
	test: {
		include: ['test/**/*.test.{ts,tsx}'],
		coverage: { include: ['src/**'], exclude: ['src/cli/bin.ts'] },
	},
});
