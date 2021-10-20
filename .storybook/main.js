const path = require('path');

module.exports = {
	stories: ['../src/**/*.stories.@(tsx|mdx)'],
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'@storybook/addon-docs',
		'@storybook/addon-controls',
		'@storybook/addon-actions',
		'@storybook/addon-viewport',
		'storybook-addon-i18n/register',
	],
	webpackFinal: async config => ({
		...config,
		resolve: {
			...config.resolve,
			alias: {
				...config.resolve?.alias,
				'@react-flow-app/components': path.resolve(__dirname, '../src/components'),
				'@react-flow-app/helpers': path.resolve(__dirname, '../src/helpers'),
				'@react-flow-app/hooks': path.resolve(__dirname, '../src/hooks'),
				'@react-flow-app/models': path.resolve(__dirname, '../src/models'),
				'@react-flow-app/providers': path.resolve(__dirname, '../src/providers'),
				'@react-flow-app/sb': path.resolve(__dirname, '../src/storybook'),
				'@react-flow-app/types': path.resolve(__dirname, '../src/types'),
			},
		},
	}),
};
