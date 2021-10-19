import {
	TFlowScreenActionCallbackResult,
	TFlowListen,
	TFlowListenCallback,
	TScreens,
	TStepOptions,
	TFlowStartMethodOutput,
} from '@types';
import { Flow } from '../flow';

export class FlowManager<
	TScreensInner extends TScreens,
	TFlowName extends string,
	TFlowStep extends keyof TScreensInner
> {
	private _instance;
	flows: Record<TFlowName, Flow>;
	screens: TScreensInner;
	simpleFlows: Record<TFlowName, Partial<Record<TFlowStep, any>>>;

	constructor(screens: TScreensInner, simpleFlows: Record<TFlowName, Partial<Record<TFlowStep, any>>>) {
		if (!this._instance) {
			this.screens = screens;
			this.simpleFlows = simpleFlows;
			this.flows = {} as any;

			this._instance = this;
		}

		return this._instance;
	}

	private checkFlowExists = (name: string, throwException = true): boolean => {
		const exists = this.flows.hasOwnProperty(name);

		if (!exists && throwException) {
			throw new Error(`The flow name "${name}" doesn't exists.`);
		}

		return exists;
	};

	flow = (name: TFlowName) => {
		console.log('FlowManager > flow [start]', { name });

		if (!this.flows.hasOwnProperty(name)) {
			this.flows[name] = new Flow(name);
		}

		console.log('FlowManager > flow [end]', { name, flows: this.flows });

		return {
			steps: this.steps(name),
		};
	};

	getFlow = (name: string): Flow | undefined => {
		// if (!FlowManager.flows.hasOwnProperty(name)) {
		//   throw new Error(`Flow ${name} not exists.`);
		// }

		return this.flows[name];
	};

	steps = (flowName: string) => </*TScreensInner extends TScreens,*/ TStepName extends keyof TScreensInner>(
		// screens: TScreensInner,
		steps: Partial<Record<TStepName, TStepOptions>>
	) => {
		this.checkFlowExists(flowName);

		const flow = this.getFlow(flowName);

		Object.keys(steps).forEach(step => {
			const screen = this.screens[step];

			console.log('steps', {
				screens: this.screens,
				screen,
				step,
			});

			flow.addStep(screen, step, (steps as any)[step]);
		});

		console.log('flow', { flow });

		return {
			// flow: (): Flow => {
			// 	return this.getFlow(flowName);
			// },
			step: <TCurrentStepName extends keyof typeof steps>(name: TCurrentStepName) => {
				const screen = this.screens[name];
				type ScreenActions = typeof screen['actions'][number];

				return (
					screenActions: Record<ScreenActions, keyof typeof steps | (() => TFlowScreenActionCallbackResult)>
				): void => {
					Object.keys(screenActions).forEach(action => {
						const gotoScreen = (screenActions as any)[action];

						console.log('steps', {
							screens: this.screens,
							steps,
							name,
							gotoScreen,
							screenActions,
						});

						flow.addAction(name as any, action, gotoScreen);
					});

					console.log('flow final', {
						flow,
					});
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			listen: (input: TFlowListenCallback | { callback: TFlowListenCallback; type: TFlowListen }) => {
				if (typeof input === 'function') {
					const params: any = input;
					return flow.addListener(params, 'all');
				} else {
					const params: any = input;
					return flow.addListener(params.callback, params.type);
				}
			},
			start: <TStepName extends keyof typeof steps>(stepName?: TStepName): TFlowStartMethodOutput => {
				return {
					flowName,
					stepName: stepName as any,
				};
			},
			navigateTo: <TStepName extends keyof typeof steps>(
				stepName: TStepName
			): TFlowScreenActionCallbackResult => {
				return {
					flowName,
					stepName: stepName as any,
				};
			},
		};
	};
}
