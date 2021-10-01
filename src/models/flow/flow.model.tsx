import React from 'react';
import { Placeholder } from '@components';
import { CoreHelper } from '@helpers';
import { TScreens, TStepOptions } from '@types';
import { Step } from '../step';

export class Flow {
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
				<React.Suspense fallback={<Placeholder loading />}>
					<Screen />
				</React.Suspense>
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
