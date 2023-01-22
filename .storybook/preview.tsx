import { DocsContainer, DocsPage } from '@storybook/addon-docs/blocks';
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';
import { addDecorator, addParameters } from '@storybook/react';
import anysort from 'anysort';
import { LoggerHelper } from '../src/helpers';

addParameters({
	docs: {
		container: DocsContainer,
		page: DocsPage,
	},
	viewport: {
		viewports: INITIAL_VIEWPORTS,
		defaultViewport: 'iphone6',
	},
	options: {
		/**
		 * display the top-level grouping as a "root" in the sidebar
		 * @type {Boolean}
		 */
		showRoots: true,
		storySort: (previous, next) => {
			const [previousStory, previousMeta] = previous;
			const [nextStory, nextMeta] = next;

			return anysort(previousMeta.kind, nextMeta.kind, [
				'Overview/Introduction',
				'Overview/Getting Started',
				'Overview/Themes',
				'Overview/**',
				'Components/**',
			]);
		},
	},
	actions: { argTypesRegex: '^on[A-Z].*' },
});

export const globalTypes = {
	language: {
		name: 'Language',
		description: 'Change the language of component preview',
		defaultValue: 'pt',
		toolbar: {
			icon: 'globe',
			items: [
				{ value: 'pt', title: 'PT - Portuguese' },
				{ value: 'en', title: 'EN - English' },
			],
		},
	},
	platform: {
		name: 'Platform',
		description: 'Change the platform of component preview',
		defaultValue: 'mobile',
		toolbar: {
			icon: 'browser',
			items: [
				{ value: 'mobile', title: 'Mobile - App and browser mobile devices' },
				{ value: 'desktop', title: 'Desktop - Tablets and PC devices' },
			],
		},
	},
};

LoggerHelper.init({
	all: true,
});
