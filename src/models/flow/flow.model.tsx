import React from 'react';
import { Placeholder } from '../../components';
import { CoreHelper, LoggerHelper } from '../../helpers';
import {
	TFlowActionOptions,
	TFlowBackMethodOutput,
	TFlowDispatchMethodOutput,
	TFlowLastAction,
	TFlowListen,
	TFlowListenCallback,
	TFlowListenCallbackInput,
	TFlowListenCallbackInputDispatch,
	TFlowListenCallbackInputOptions,
	TFlowManagerOptions,
	TFlowScreenActionCallbackResult,
	TFlowStartMethodOutput,
	TScreen,
	TScreens,
	TStepOptions,
} from '../../types';
import { Step } from '../step';

export class Flow {
	name: string;
	baseUrl: string;
	steps: Record<string, Step>;
	anotherObjects: Record<string, Step>;
	last2Steps: Record<number, string>;
	history: Array<string>;
	listeners: Record<TFlowListen, TFlowListenCallback[]>;
	fromFlowName?: string;
	initialStepName?: string;
	lastRenderStepName?: string;
	lastAction?: TFlowLastAction;

	constructor(name: string, baseUrl: string) {
		this.name = name;
		this.baseUrl = baseUrl;
		this.steps = {} as any;
		this.last2Steps = {};
		this.history = [];
		this.listeners = {
			all: [],
			back: [],
			backExit: [],
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
		if (this.steps.hasOwnProperty(value) && this.last2Steps[0] !== value) {
			this.last2Steps[1] = this.last2Steps[0];
			this.last2Steps[0] = value;
		}
	}

	private logger = (message: string, ...args: any[]): void => {
		LoggerHelper.log('Flow')(message, args);
	};

	private callListeners = (
		type: TFlowListen,
		dispatch?: TFlowListenCallbackInputDispatch,
		options?: TFlowListenCallbackInputOptions
	): void => {
		const currentStepName =
			type === 'mount' ? this.currentStepName : this.lastRenderStepName || this.currentStepName;
		const currentStep = this.steps[currentStepName];

		const data: TFlowListenCallbackInput = {
			url: this.buildUrl(currentStep),
			flowName: this.name,
			currentStepName,
			type,
			dispatch,
			options,
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

	getLastAction = (): TFlowLastAction | undefined => {
		return this.lastAction;
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

	addAction = (screenName: string, actionName: string, gotoScreenName: string, isAnotherObject = false): void => {
		if (isAnotherObject) {
			this.anotherObjects = this.anotherObjects || {};
			this.anotherObjects[screenName] = this.anotherObjects[screenName] || {
				actions: {},
				loader: (): React.LazyExoticComponent<any> => React.lazy(() => import('./emptyComponent')),
				name: screenName,
			};

			this.anotherObjects[screenName].actions[actionName] = gotoScreenName;
		} else {
			const step = this.steps[screenName];

			step.actions[actionName] = gotoScreenName;
		}
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

	render = (options: TFlowManagerOptions): React.ReactNode => {
		const currentStepName = this.currentStepName;
		const { animation } = options;

		this.logger('Flow > render [start]', { currentStepName });

		if (!currentStepName) {
			this.lastRenderStepName = currentStepName;
			return null;
		}

		// check if lastRenderStepName is undefined to dispatch first mount
		if (!this.lastRenderStepName || this.lastRenderStepName !== this.currentStepName) {
			this.mount();
		}

		this.lastRenderStepName = currentStepName;

		if (currentStepName && this.steps.hasOwnProperty(currentStepName)) {
			const step = this.steps[currentStepName];
			const { clearHistory = false } = step.options || {};

			if (clearHistory) {
				this.clearHistory();
			}

			const Screen = step.loader();

			this.logger('Flow > render [start]', { currentStepName, Screen });

			const fallback = animation === false ? <></> : animation === true ? <Placeholder loading /> : animation;

			return (
				<React.Suspense fallback={fallback}>
					<Screen />
				</React.Suspense>
			);
		}

		return null;
	};

	start = (
		stepName?: string,
		fromFlowName?: string,
		options?: TFlowActionOptions,
		isFromBack = false,
		initialHistory: Array<string> = undefined
	): TFlowStartMethodOutput => {
		this.logger('start', { stepName, fromFlowName, options });

		this.lastAction = undefined;
		this.fromFlowName = this.name !== fromFlowName ? fromFlowName : undefined;
		const currentStepName = stepName || this.currentStepName || this.initialStepName || this.firstStepName;
		const { clearHistory = false } = options || {};

		// only set history when initial history is defined
		if (Array.isArray(initialHistory) && initialHistory.length > 0) {
			this.history = initialHistory;
		}

		// check if is back
		if (isFromBack) {
			this.lastAction = 'back';
			// clear last render step name to call mount listener
			this.lastRenderStepName = undefined;

			// when not has history and exists from flow name navigate to
			if (this.fromFlowName && this.history.length === 0) {
				return {
					changed: true,
					currentFlowName: this.fromFlowName,
				};
			}
		}

		if (this.steps.hasOwnProperty(currentStepName)) {
			this.currentStepName = currentStepName;

			if (clearHistory || this.getCurrentStep().options.clearHistory) {
				this.clearHistory();
			}

			if (currentStepName === this.getPreviousStep()?.name) {
				this.removeLastStepHistory();
			}

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
		let backStepName = this.history.pop();

		// when backStepName is equal to currentStepName, try get another back step, to working properly because outside navigation
		// ex: when last screen not doing anything and keep in the same screen. If the user click in back, it's necessary navigate to before step
		if (backStepName === this.currentStepName) {
			backStepName = this.history.pop();
		}

		if (backStepName) {
			this.lastAction = 'back';
			this.currentStepName = backStepName;

			this.callListeners('back');

			return {
				changed: true,
				currentFlowName: this.name,
				currentStepName: this.currentStepName,
				historyUrl: this.buildUrl(),
			};
		} else if (this.fromFlowName) {
			this.callListeners('backExit');

			return { changed: true, currentFlowName: this.fromFlowName };
		}

		return { changed: false };
	};

	private removeLastStepHistory = (): void => {
		if (this.history.length > 0) {
			this.history.pop();
		}
	};

	clearHistory = (): void => {
		this.history = [];
		this.fromFlowName = undefined;
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	private treatHistory = (nextStepName: string): void => {
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

			// check allow cyclic for current step
			if (!CoreHelper.getValueOrDefault(currentStep.options?.allowCyclicHistory, false)) {
				const numberOfStepOccurrences = this.history.filter(x => x === this.currentStepName).length;

				if (numberOfStepOccurrences > 0) {
					const firstStepOccurrenceIndex = this.history.findIndex(x => x === this.currentStepName);

					if (firstStepOccurrenceIndex >= 0) {
						this.history = this.history.splice(0, firstStepOccurrenceIndex + 1);
					}
				}
			}

			// check allow cyclic for next step
			const nextStep = this.steps[nextStepName];
			if (nextStep && !CoreHelper.getValueOrDefault(nextStep.options?.allowCyclicHistory, false)) {
				const numberOfStepOccurrences = this.history.filter(x => x === nextStepName).length;

				if (numberOfStepOccurrences > 0) {
					const firstStepOccurrenceIndex = this.history.findIndex(x => x === nextStepName);

					if (firstStepOccurrenceIndex >= 0) {
						this.history = this.history.splice(0, firstStepOccurrenceIndex + 1);
					}
				}
			}
		}
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	dispatch = (screen: TScreen, actionName: string, payload?: Record<string, any>): TFlowDispatchMethodOutput => {
		this.logger('Flow > dispatch [start]', {
			actionName,
			payload,
			flow: this,
		});

		let currentStep = this.currentStepName ? this.steps[this.currentStepName] : undefined;
		let nextStepNameOrFn = undefined;
		let changed = false;
		let nextStepFnResult: TFlowScreenActionCallbackResult = {
			flowName: undefined,
			stepName: undefined,
		};
		const currentStepOptions = CoreHelper.getValueOrDefault(currentStep.options, {});

		// check if used action based on current step or based on passed screen or passed another object, based on follow priorities
		// 1. action from current step
		// 2. action from passed screen/step
		// 2. action from passed another object
		const existsActionInCurrentStep = currentStep?.actions.hasOwnProperty(actionName);
		const existsActionInPassedScreen =
			screen.actions.includes(actionName) && this.steps.hasOwnProperty((screen as any).name);
		const existsActionInPassedAnotherObjects =
			screen.actions.includes(actionName) && this.anotherObjects?.hasOwnProperty((screen as any).name);

		if (!existsActionInCurrentStep && existsActionInPassedScreen) {
			currentStep = this.steps[(screen as any).name];
		} else if (!existsActionInCurrentStep && !existsActionInPassedScreen && existsActionInPassedAnotherObjects) {
			currentStep = this.anotherObjects[(screen as any).name];
		}

		if (existsActionInCurrentStep || existsActionInPassedScreen || existsActionInPassedAnotherObjects) {
			nextStepNameOrFn = currentStep.actions[actionName];

			if (typeof nextStepNameOrFn === 'string') {
				changed = this.currentStepName !== nextStepNameOrFn;

				if (changed) {
					this.treatHistory(nextStepNameOrFn);
				}

				this.currentStepName = nextStepNameOrFn;
			} else {
				nextStepFnResult = nextStepNameOrFn() || {};

				this.treatHistory(nextStepFnResult.stepName);

				if (nextStepFnResult?.options?.history) {
					this.history = nextStepFnResult?.options?.history;
				} else if (nextStepFnResult?.options?.clearHistory) {
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

		const clearHistory = nextStepFnResult.options?.clearHistory || currentStepOptions.clearHistory || false;
		const ignoreHistory = currentStepOptions.ignoreHistory || false;

		if (changed) {
			this.lastAction = 'dispatch';
			this.callListeners(
				'dispatch',
				{ actionName, payload },
				{
					clearHistory,
					ignoreHistory,
				}
			);
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
			clearHistory,
			ignoreHistory,
		};
	};
}
