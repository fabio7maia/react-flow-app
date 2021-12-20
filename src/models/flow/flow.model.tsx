import React from 'react';
import { Placeholder } from '../../components';
import { CoreHelper, LoggerHelper } from '../../helpers';
import {
	TFlowActionOptions,
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
	last2Steps: Record<number, string>;
	history: Array<string>;
	listeners: Record<TFlowListen, TFlowListenCallback[]>;
	fromFlowName?: string;
	initialStepName?: string;

	constructor(name: string, baseUrl: string) {
		this.name = name;
		this.baseUrl = baseUrl;
		this.steps = {} as any;
		this.last2Steps = {};
		this.history = [];
		this.listeners = {
			all: [],
			back: [],
			dispatch: [],
			mount: [],
		};
	}

	private get stepsArray(): string[] {
		return Object.keys(this.steps);
	}

	private get firstStepName(): string {
		const stepsArray = this.stepsArray;

		return stepsArray.length > 0 ? stepsArray[0] : undefined;
	}

	private get lastStepName(): string {
		return this.last2Steps[1];
	}

	private get currentStepName(): string {
		return this.last2Steps[0];
	}

	private set currentStepName(value: string) {
		if (this.last2Steps[0] !== value) {
			this.last2Steps[1] = this.last2Steps[0];
			this.last2Steps[0] = value;
		}
	}

	private logger = (message: string, ...args: any[]): void => {
		LoggerHelper.log('Flow')(message, args);
	};

	private callListeners = (type: TFlowListen, dispatch?: TFlowListenCallbackInputDispatch): void => {
		const currentStepName =
			type === 'mount'
				? this.last2Steps[0]
				: this.last2Steps[1]
				? this.last2Steps[1]
				: this.currentStepName !== this.lastStepName
				? this.currentStepName
				: '';
		const currentStep = this.steps[currentStepName];

		const data: TFlowListenCallbackInput = {
			url: this.buildUrl(currentStep),
			flowName: this.name,
			currentStepName,
			type,
			dispatch,
		};

		this.listeners[type].forEach(fn => fn(data));

		this.listeners['all'].forEach(fn => fn(data));
	};

	hasPreviousStep = (): boolean => {
		return this.history.length > 0 || this.fromFlowName ? true : false;
	};

	getPreviousStep = (): Step | undefined => {
		return this.history.length > 0 ? this.steps[this.history[this.history.length - 1]] : undefined;
	};

	getCurrentStep = (): Step | undefined => {
		return this.steps[this.currentStepName];
	};

	getHistory = (): string[] => {
		return this.history;
	};

	addStep = <TScreensInner extends TScreens, TScreen extends TScreens[0]>(
		screen: TScreen,
		name: string,
		options?: TStepOptions
	): void => {
		const step = new Step(name as string, screen.loader, options);

		if (!this.initialStepName && CoreHelper.getValueOrDefault(options.initialStep, false)) {
			this.initialStepName = step.name;
		}

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

	private buildUrl = (currentStep?: Step): string => {
		let baseUrl = this.baseUrl;
		currentStep = currentStep || this.getCurrentStep();
		const currentStepUrl = currentStep ? this.stepUrl(currentStep) : '';

		baseUrl = baseUrl.startsWith('/') ? baseUrl.substring(1, baseUrl.length) : baseUrl;
		baseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;

		return `/${baseUrl}/${currentStepUrl}`;
	};

	render = (): React.ReactNode => {
		const currentStepName = this.currentStepName;

		this.logger('Flow > render [start]', { currentStepName });

		if (!currentStepName) {
			return null;
		}

		// check if lastStep[1] is undefined to dispatch first mount
		if (!this.last2Steps[1] || this.lastStepName !== this.currentStepName) {
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

	start = (stepName?: string, fromFlowName?: string, options?: TFlowActionOptions): TFlowStartMethodOutput => {
		this.logger('start', { stepName, fromFlowName, options });

		this.fromFlowName = fromFlowName;
		const currentStepName = stepName || this.currentStepName || this.initialStepName || this.firstStepName;
		const { clearHistory = false } = options || {};

		if (this.steps.hasOwnProperty(currentStepName)) {
			if (clearHistory) {
				this.clearHistory();
			}

			if (currentStepName === this.getPreviousStep()?.name) {
				this.removeLastStepHistory();
			}

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

	private removeLastStepHistory = (): void => {
		if (this.history.length > 0) {
			this.history.pop();
		}
	};

	private clearHistory = (): void => {
		this.history = [];
		this.fromFlowName = undefined;
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
				this.clearHistory();
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
				this.treatHistory();

				nextStepFnResult = nextStepNameOrFn() || {};

				if (nextStepFnResult?.options?.clearHistory) {
					this.clearHistory();
				}

				if (nextStepFnResult.stepName) {
					this.currentStepName = nextStepFnResult.stepName;
				} else {
					// set to current step to update lastThreeSteps
					// eslint-disable-next-line no-self-assign
					this.currentStepName = this.currentStepName;
				}

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
