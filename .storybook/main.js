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
				'@components': path.resolve(__dirname, '../src/components'),
				'@helpers': path.resolve(__dirname, '../src/helpers'),
				'@hooks': path.resolve(__dirname, '../src/hooks'),
				'@models': path.resolve(__dirname, '../src/models'),
				'@providers': path.resolve(__dirname, '../src/providers'),
				'@sb': path.resolve(__dirname, '../src/storybook'),
				'@types': path.resolve(__dirname, '../src/types'),
			},
		},
	}),
};
