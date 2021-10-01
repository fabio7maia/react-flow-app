import { TScreens, TStepOptions } from '@types';
import { Flow } from '../flow';

export class FlowManager {
	static flows: Record<string, Flow> = {};

	static flow = (name: string) => {
		console.log('FlowManager > flow [start]', { name });

		if (!FlowManager.flows.hasOwnProperty(name)) {
			FlowManager.flows[name] = new Flow(name);
		}

		console.log('FlowManager > flow [end]', { name, flows: FlowManager.flows });

		return {
			steps: FlowManager.steps(name),
		};
	};

	static getFlow = (name: string): Flow => {
		// if (!FlowManager.flows.hasOwnProperty(name)) {
		//   throw new Error(`Flow ${name} not exists.`);
		// }

		return FlowManager.flows[name];
	};

	private static steps = (flowName: string) => <
		TScreensInner extends TScreens,
		TStepName extends keyof TScreensInner
	>(
		screens: TScreensInner,
		steps: Partial<Record<TStepName, TStepOptions>>
	) => {
		Object.keys(steps).forEach(step => {
			const screen = screens[step];

			console.log('steps', {
				screens,
				screen,
				step,
			});

			FlowManager.getFlow(flowName).addStep(screen, step, (steps as any)[step]);
		});

		console.log('flow', { flow: FlowManager.getFlow(flowName) });

		return {
			step: <TCurrentStepName extends keyof typeof steps>(name: TCurrentStepName) => {
				const screen = screens[name];
				type ScreenActions = typeof screen['actions'][number];

				return (screenActions: Record<ScreenActions, keyof typeof steps | (() => void)>) => {
					Object.keys(screenActions).forEach(action => {
						const gotoScreen = (screenActions as any)[action];

						console.log('steps', {
							screens,
							steps,
							name,
							gotoScreen,
							screenActions,
						});

						FlowManager.getFlow(flowName).addAction(name as any, action, gotoScreen);
					});

					console.log('flow final', {
						flow: FlowManager.getFlow(flowName),
					});
				};
			},
			watch: ({}) => {},
		};
	};
}
