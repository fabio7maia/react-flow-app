import { FlowManager } from '@models';
import { screens } from './screens';

export const fm = new FlowManager(screens);

export const f0 = fm.flow({ name: 'f0', baseUrl: 'flows/f0' }).steps({
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

export const f1 = fm.flow({ name: 'f1', baseUrl: 'flows/f1' }).steps({ screen2: {}, screen3: {} });

f1.step('screen2')({ next: 'screen3' });
f1.step('screen3')({
	end: () => {
		alert('Final step');

		// return {
		// 	currentFlowName: 'f0',
		// 	currentStepName: 'screen2',
		// };

		return f0.navigateTo('screen2');
	},
});

// f0.listen(input => {
// 	console.log('listen all', { input });
// });

f0.listen({
	callback: input => {
		console.log('listen back', { input });
	},
	type: 'back',
});

f0.listen({
	callback: input => {
		console.log('listen dispatch', { input });
	},
	type: 'dispatch',
});

f0.listen({
	callback: input => {
		console.log('listen mount', { input });
	},
	type: 'mount',
});
