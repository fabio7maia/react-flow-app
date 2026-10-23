import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

addons.setConfig({
	theme: create({
		base: 'light',
		brandTitle: 'react-flow-app',
		brandImage: './wordmark-light.svg',
		brandUrl: 'https://react-flow-app-pr.vercel.app',
		brandTarget: '_blank',
		colorPrimary: '#d9480f',
		colorSecondary: '#1d63d8',
		appBg: '#eef1f5',
		appContentBg: '#ffffff',
		textColor: '#16202c',
		fontBase: "'Overpass', 'Segoe UI', system-ui, sans-serif",
		fontCode: "'Overpass Mono', ui-monospace, Menlo, monospace",
	}),
});
