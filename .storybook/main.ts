import { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(tsx|mdx)'],
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'@storybook/addon-viewport',
		'@storybook/addon-webpack5-compiler-swc',
	],
	staticDirs: ['../public'],
	framework: '@storybook/react-vite',
	docs: {},
	typescript: {
		reactDocgen: 'react-docgen-typescript',
	},
};

export default config;
