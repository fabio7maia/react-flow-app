import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const repo = 'https://github.com/fabio7maia/react-flow-app';

export default defineConfig({
	site: 'https://react-flow-app-pr.vercel.app',
	integrations: [
		starlight({
			title: 'react-flow-app',
			description:
				'Event-based navigation for React: flows declared as data, typed end to end, with a diagram, generated tests and analytics.',
			logo: { src: './src/assets/logo.svg', alt: 'react-flow-app' },
			favicon: '/brand/favicon.svg',
			head: [
				{ tag: 'link', attrs: { rel: 'icon', href: '/brand/favicon.ico', sizes: '48x48' } },
				{ tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/brand/apple-touch-icon.png' } },
				{ tag: 'meta', attrs: { property: 'og:image', content: 'https://react-flow-app-pr.vercel.app/brand/og-image.png' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
			],
			social: [{ icon: 'github', label: 'GitHub', href: repo }],
			editLink: { baseUrl: `${repo}/edit/v3/website/` },
			customCss: ['./src/styles/theme.css'],
			lastUpdated: true,
			sidebar: [
				{ label: 'Getting started', items: ['getting-started/installation', 'getting-started/quick-start'] },
				{
					label: 'Guides',
					items: [
						'guides/screens',
						'guides/flows',
						'guides/history',
						'guides/react',
						'guides/events',
						'guides/analytics',
						'guides/urls',
						'guides/testing',
						'guides/typing',
					],
				},
				{ label: 'Migration', items: ['migration/v2-to-v3'] },
				{
					label: 'Demo',
					items: [
						'demo',
						{ label: 'Storybook', link: 'https://fabio7maia.github.io/react-flow-app/v3/', attrs: { target: '_blank' } },
					],
				},
				{ label: 'Reference', items: ['reference/api', 'reference/releases'] },
			],
		}),
	],
});
