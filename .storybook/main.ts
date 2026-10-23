import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const src = (path: string): string => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

const config: StorybookConfig = {
	stories: ['../stories/**/*.mdx', '../stories/**/*.stories.tsx'],
	addons: ['@storybook/addon-essentials'],
	framework: { name: '@storybook/react-vite', options: {} },
	viteFinal: config =>
		mergeConfig(config, {
			resolve: {
				// The library from its sources, like the tests (tsconfig paths).
				alias: [
					{ find: /^react-flow-app$/, replacement: src('index.ts') },
					{ find: /^react-flow-app\/react$/, replacement: src('react/index.tsx') },
					{ find: /^react-flow-app\/(analytics|testing)$/, replacement: src('$1/index.ts') },
				],
			},
		}),
};

export default config;
