import { FlowManager } from '@models';
import { screens } from './screens';

export const f0 = FlowManager.flow('f0').steps(screens, { screen1: {}, screen2: {}, screen3: {} });

f0.step('screen1')({ next: 'screen2', skip: 'screen3' });
f0.step('screen2')({ next: 'screen3' });
f0.step('screen3')({
	end: (): void => {
		alert('Final step');
	},
});

f0.watch(input => {
	console.log('watch 1', { input });
});

f0.watch({
	callback: input => {
		console.log('watch 2', { input });
	},
	type: 'dispatch',
});
