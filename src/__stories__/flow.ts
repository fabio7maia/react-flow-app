import { FlowManager } from '@models';
import { screens } from './screens';

export const f0 = FlowManager.flow('f0').steps(screens, {
	screen1: {},
	screen2: { ignoreHistory: true /*, clearHistory: true*/ },
	screen3: {},
});

f0.step('screen1')({ next: 'screen2', skip: 'screen3' });
f0.step('screen2')({ next: 'screen3' });
f0.step('screen3')({
	// end: (): void => {
	// 	alert('Final step');
	// },
	end: 'screen1',
});

export const f1 = FlowManager.flow('f1').steps(screens, { screen2: {}, screen3: {} });

f1.step('screen2')({ next: 'screen3' });
f1.step('screen3')({
	end: () => {
		alert('Final step');

		return {
			currentFlowName: 'f0',
			currentStepName: 'screen2',
		};
	},
});

// f0.watch(input => {
// 	console.log('watch all', { input });
// });

f0.watch({
	callback: input => {
		console.log('watch back', { input });
	},
	type: 'back',
});

f0.watch({
	callback: input => {
		console.log('watch dispatch', { input });
	},
	type: 'dispatch',
});

f0.watch({
	callback: input => {
		console.log('watch mount', { input });
	},
	type: 'mount',
});
