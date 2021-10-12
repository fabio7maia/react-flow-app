import React from 'react';
import { Placeholder } from '@components';
import { CoreHelper } from '@helpers';
import { TFlowWatch, TFlowWatchCallback, TScreens, TStepOptions } from '@types';
import { Step } from '../step';

export class Flow {
	name: string;
	steps: Record<string, Step>;
	oldStepName?: string;
	currentStepName?: string;
	history: Array<string>;
	watchers: Record<TFlowWatch, TFlowWatchCallback[]>;

	constructor(name: string) {
		this.name = name;
		this.steps = {};
		this.oldStepName = undefined;
		this.currentStepName = undefined;
		this.history = [];
		this.watchers = {
			all: [],
			dispatch: [],
			mount: [],
			unmount: [],
		};
	}

	private logger = (message: string, ...args: any[]): void => {
		console.log('Flow', message, args);
	};

	private callWatchers = (type: TFlowWatch): void => {
		const data = {
			oldStepName: this.oldStepName,
			currentStepName: this.currentStepName !== this.oldStepName ? this.currentStepName : '__function__',
		};

		this.watchers[type].forEach(fn => fn(data));

		this.watchers['all'].forEach(fn => fn(data));
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

	addWatcher = (callback: TFlowWatchCallback, type: TFlowWatch = 'all') => {
		this.watchers[type].push(callback);
	};

	render = (): React.ReactNode => {
		const currentStepName = this.currentStepName || this.steps[Object.keys(this.steps)[0]].name;

		this.logger('Flow > render [start]', { currentStepName });

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
			this.oldStepName = this.currentStepName;
			this.currentStepName = backStepName;

			this.callWatchers('dispatch');

			return true;
		}

		return false;
	};

	dispatch = (actionName: string, payload?: Record<string, any>): boolean => {
		this.logger('Flow > dispatch [start]', {
			actionName,
			payload,
			flow: this,
		});

		const currentStep = this.currentStepName ? this.steps[this.currentStepName] : undefined;
		let nextStepNameOrFn = undefined;
		let changed = false;

		if (currentStep?.actions.hasOwnProperty(actionName)) {
			nextStepNameOrFn = currentStep.actions[actionName];

			if (typeof nextStepNameOrFn === 'string') {
				changed = this.currentStepName !== nextStepNameOrFn;

				if (changed && this.currentStepName) {
					const currentStep = this.steps[this.currentStepName];

					this.logger('Flow > dispatch', {
						nextStepNameOrFn,
						changed,
						ignoreHistory: currentStep.options?.ignoreHistory,
					});

					if (!CoreHelper.getValueOrDefault(currentStep.options?.ignoreHistory, false)) {
						this.history.push(this.currentStepName);
					}
				}

				this.oldStepName = this.currentStepName;
				this.currentStepName = nextStepNameOrFn;
			} else {
				this.oldStepName = this.currentStepName;

				nextStepNameOrFn();

				changed = true;
			}
		}

		if (changed) {
			this.callWatchers('dispatch');
		}

		this.logger('Flow > dispatch [end]', {
			nextStepNameOrFn,
			changed,
			flow: this,
		});

		return changed;
	};
}
