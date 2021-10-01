import React, { Suspense } from 'react';
import { Placeholder } from '@components';
import { CoreHelper } from '@helpers';
import { TScreens, TStepOptions, TStepAction } from '@types';

class Step {
	name: string;
	url?: string;
	loader: () => React.LazyExoticComponent<React.ComponentType<any>>;
	actions: Record<string, TStepAction>;
	options?: TStepOptions;

	constructor(
		name: string,
		loader: () => React.LazyExoticComponent<React.ComponentType<any>>,
		options?: TStepOptions
	) {
		this.name = name;
		this.loader = loader;
		this.actions = {};
		this.options = options;
	}
}

class Flow {
	name: string;
	steps: Record<string, Step>;
	currentStepName?: string;
	history: Array<string>;

	constructor(name: string) {
		this.name = name;
		this.steps = {};
		this.currentStepName = undefined;
		this.history = [];
	}

	private logger = (message: string, ...args: any[]): void => {
		console.log('Flow', message, args);
	};

	addStep = <TScreensInner extends TScreens, TScreen extends TScreens[0]>(
		screen: TScreen,
		name: string,
		options?: TStepOptions
	) => {
		const step = new Step(name as string, screen.loader, options);

		this.steps[name] = step;
	};

	addAction = (screenName: string, actionName: string, gotoScreenName: string) => {
		const step = this.steps[screenName];

		step.actions[actionName] = gotoScreenName;
	};

	render = (): React.ReactNode => {
		const currentStepName = this.currentStepName || this.steps[Object.keys(this.steps)[0]].name;

		if (currentStepName && this.steps.hasOwnProperty(currentStepName)) {
			const Screen = this.steps[currentStepName].loader();

			return (
				<Suspense fallback={<Placeholder loading />}>
					<Screen />
				</Suspense>
			);
		}

		return null;
	};

	start = (stepName?: string) => {
		this.logger('start', { stepName });

		const currentStepName = stepName || this.steps[Object.keys(this.steps)[0]].name;

		this.currentStepName = currentStepName;
	};

	back = (): boolean => {
		const backStepName = this.history.pop();

		if (backStepName) {
			this.currentStepName = backStepName;

			return true;
		}

		return false;
	};

	doAction = (actionName: string, payload?: Record<string, any>): boolean => {
		const currentStep = this.currentStepName ? this.steps[this.currentStepName] : undefined;
		let nextStepNameOrFn = undefined;
		let changed = false;

		if (currentStep?.actions.hasOwnProperty(actionName)) {
			nextStepNameOrFn = currentStep.actions[actionName];

			if (typeof nextStepNameOrFn === 'string') {
				changed = this.currentStepName !== nextStepNameOrFn;

				if (changed && this.currentStepName) {
					const currentStep = this.steps[this.currentStepName];

					this.logger('Flow > doAction', {
						nextStepNameOrFn,
						changed,
						ignoreHistory: currentStep.options?.ignoreHistory,
					});

					if (!CoreHelper.getValueOrDefault(currentStep.options?.ignoreHistory, false)) {
						this.history.push(this.currentStepName);
					}
				}

				this.currentStepName = nextStepNameOrFn;
			} else {
				nextStepNameOrFn();
			}
		}

		this.logger('Flow > doAction', {
			nextStepNameOrFn,
			changed,
			currentStepName: this.currentStepName,
			history: this.history,
		});

		return changed;
	};
}

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
