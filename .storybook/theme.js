import { create } from '@storybook/theming/create';
import puzzle from './puzzle.png';

export default create({
	base: 'light',
	brandTitle: 'Puzzle Framework - React App Flow',
	brandImage: puzzle,
	appBg: '#FFF',
	barSelectedColor: '#ff5b5b',
	fontCode: 'Poppins, sans-serif',
	colorSecondary: '#1890ff',
	colorPrimary: '#ff5b5b',
});
