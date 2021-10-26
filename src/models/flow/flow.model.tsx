import React from 'react';
import { Placeholder } from '../../components';
import { CoreHelper, LoggerHelper } from '../../helpers';
import {
	TFlowBackMethodOutput,
	TFlowDispatchMethodOutput,
	TFlowListen,
	TFlowListenCallback,
	TFlowListenCallbackInput,
	TFlowListenCallbackInputDispatch,
	TFlowScreenActionCallbackResult,
	TFlowStartMethodOutput,
	TScreens,
	TStepOptions,
} from '../../types';
import { Step } from '../step';

export class Flow {
	name: string;
	baseUrl: string;
	steps: Record<string, Step>;
	lastSteps: Record<number, string>;
	history: Array<string>;
	listeners: Record<TFlowListen, TFlowListenCallback[]>;
	fromFlowName?: string;

	constructor(name: string, baseUrl: string) {
		this.name = name;
		this.baseUrl = baseUrl;
		this.steps = {} as any;
		this.lastSteps = {};
		this.history = [];
		this.listeners = {
			all: [],
			back: [],
			dispatch: [],
			mount: [],
		};
	}

	private get lastStepName(): string {
		return this.lastSteps[1];
	}

	private get currentStepName(): string {
		return this.lastSteps[0];
	}

	private set currentStepName(value: string) {
		this.lastSteps[1] = this.lastSteps[0];
		this.lastSteps[0] = value;
	}

	private logger = (message: string, ...args: any[]): void => {
		LoggerHelper.log('Flow')(message, args);
	};

	private callListeners = (type: TFlowListen, dispatch?: TFlowListenCallbackInputDispatch): void => {
		const data: TFlowListenCallbackInput = {
			lastStepName: this.lastStepName,
			currentStepName: this.currentStepName !== this.lastStepName ? this.currentStepName : '__function__',
			type,
			dispatch,
		};

		this.listeners[type].forEach(fn => fn(data));

		this.listeners['all'].forEach(fn => fn(data));
	};

	addStep = <TScreensInner extends TScreens, TScreen extends TScreens[0]>(
		screen: TScreen,
		name: string,
		options?: TStepOptions
	): void => {
		const step = new Step(name as string, screen.loader, options);

		this.steps[name] = step;
	};

	addAction = (screenName: string, actionName: string, gotoScreenName: string): void => {
		const step = this.steps[screenName];

		step.actions[actionName] = gotoScreenName;
	};

	addListener = (callback: TFlowListenCallback, type: TFlowListen = 'all'): void => {
		this.listeners[type].push(callback);
	};

	private stepUrl = (step: Step): string => {
		return step?.options?.url || step.name;
	};

	private buildUrl = (): string => {
		let baseUrl = this.baseUrl;
		const currentStepUrl = this.stepUrl(this.steps[this.currentStepName]);

		baseUrl = baseUrl.substr(0, 1) === '/' ? baseUrl.substr(1, baseUrl.length) : baseUrl;
		baseUrl = baseUrl.substr(baseUrl.length - 1) === '/' ? baseUrl.substr(0, baseUrl.length - 1) : baseUrl;

		return `/${baseUrl}/${currentStepUrl}`;
	};

	render = (): React.ReactNode => {
		const currentStepName = this.currentStepName || this.steps[Object.keys(this.steps)[0]].name;

		this.logger('Flow > render [start]', { currentStepName });

		if (this.lastStepName !== this.currentStepName) {
			this.mount();
		}

		if (currentStepName && this.steps.hasOwnProperty(currentStepName)) {
			const Screen = this.steps[currentStepName].loader();

			this.logger('Flow > render [start]', { currentStepName, Screen });

			return (
				<React.Suspense fallback={<Placeholder loading />}>
					<Screen />
				</React.Suspense>
			);
		}

		return null;
	};

	start = (stepName?: string, fromFlowName?: string): TFlowStartMethodOutput => {
		this.logger('start', { stepName, fromFlowName });

		this.fromFlowName = fromFlowName;
		const currentStepName = stepName || this.currentStepName || this.steps[Object.keys(this.steps)[0]].name;

		if (this.steps.hasOwnProperty(currentStepName)) {
			this.currentStepName = currentStepName;

			return {
				changed: true,
				historyUrl: this.buildUrl(),
				currentFlowName: this.name,
				currentStepName: this.currentStepName,
			};
		}

		return { changed: false };
	};

	mount = (): void => {
		this.callListeners('mount');
	};

	back = (): TFlowBackMethodOutput => {
		const backStepName = this.history.pop();

		if (backStepName) {
			this.currentStepName = backStepName;

			this.callListeners('back');

			return {
				changed: true,
				currentFlowName: this.name,
				currentStepName: this.currentStepName,
				historyUrl: this.buildUrl(),
			};
		} else if (this.fromFlowName) {
			return { changed: true, currentFlowName: this.fromFlowName };
		}

		return { changed: false };
	};

	private treatHistory = (): void => {
		if (this.currentStepName) {
			const currentStep = this.steps[this.currentStepName];

			this.logger('Flow > treatHistory', {
				currentStep,
				ignoreHistory: currentStep.options?.ignoreHistory,
			});

			// when clear history it's necessary empty history and from flow name when back not doing anything
			if (CoreHelper.getValueOrDefault(currentStep.options?.clearHistory, false)) {
				this.history = [];
				this.fromFlowName = undefined;
			}

			if (!CoreHelper.getValueOrDefault(currentStep.options?.ignoreHistory, false)) {
				this.history.push(this.currentStepName);
			}
		}
	};

	dispatch = (actionName: string, payload?: Record<string, any>): TFlowDispatchMethodOutput => {
		this.logger('Flow > dispatch [start]', {
			actionName,
			payload,
			flow: this,
		});

		const currentStep = this.currentStepName ? this.steps[this.currentStepName] : undefined;
		let nextStepNameOrFn = undefined;
		let changed = false;
		let nextStepFnResult: TFlowScreenActionCallbackResult = {
			flowName: undefined,
			stepName: undefined,
		};

		if (currentStep?.actions.hasOwnProperty(actionName)) {
			nextStepNameOrFn = currentStep.actions[actionName];

			if (typeof nextStepNameOrFn === 'string') {
				changed = this.currentStepName !== nextStepNameOrFn;

				if (changed) {
					this.treatHistory();
				}

				this.currentStepName = nextStepNameOrFn;
			} else {
				// set to current step to update lastThreeSteps
				// eslint-disable-next-line no-self-assign
				this.currentStepName = this.currentStepName;

				nextStepFnResult = nextStepNameOrFn() || {};

				changed = true;
			}
		}

		if (changed) {
			this.callListeners('dispatch', { actionName, payload });
		}

		this.logger('Flow > dispatch [end]', {
			nextStepNameOrFn,
			changed,
			flow: this,
		});

		return {
			currentFlowName: nextStepFnResult.flowName,
			currentStepName: nextStepFnResult.stepName,
			changed,
			historyUrl: this.buildUrl(),
		};
	};
}
