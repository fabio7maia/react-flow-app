import { LoggerHelper } from '../../helpers';
import {
	TFlowActionOptions,
	TFlowCreatorInput,
	TFlowListen,
	TFlowListenCallback,
	TFlowManagerStartMethodOutput,
	TFlowScreenActionCallbackResult,
	TScreens,
	TStepOptions,
} from '../../types';
import { Flow } from '../flow';

export class FlowManager<
	TScreensInner extends TScreens,
	TFlowName extends string,
	TFlowStep extends keyof TScreensInner,
	TAnotherObjects extends Record<string, { actions: any }>
> {
	private _instance;
	flows: Record<TFlowName, Flow>;
	screens: TScreensInner;
	anotherObjects: TAnotherObjects;

	constructor(screens: TScreensInner, anotherObjects?: TAnotherObjects) {
		if (!this._instance) {
			this.screens = screens;
			this.anotherObjects = anotherObjects;
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

	private log = (msg: string, ...rest: any): void => {
		LoggerHelper.log('Flow')(msg, rest);
	};

	flow = (input: TFlowCreatorInput<TFlowName>) => {
		const { name, baseUrl } = input;

		if (!this.flows.hasOwnProperty(name)) {
			this.flows[name] = new Flow(name, baseUrl);
		}

		return {
			steps: this.steps(input),
		};
	};

	getFlow = (name: string): Flow | undefined => {
		return this.flows[name];
	};

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	steps = ({ name: flowName, baseUrl }: TFlowCreatorInput<TFlowName>) => <TStepName extends keyof TScreensInner>(
		steps: Partial<Record<TStepName, TStepOptions>>
	) => {
		this.checkFlowExists(flowName);

		const flow = this.getFlow(flowName);

		Object.keys(steps).forEach(step => {
			const screen = this.screens[step];

			this.log('steps', {
				screens: this.screens,
				screen,
				step,
			});

			flow.addStep(screen, step, (steps as any)[step]);
		});

		this.log('flow', { flow });

		return {
			step: <TCurrentStepName extends keyof typeof steps>(name: TCurrentStepName) => {
				const screen = this.screens[name];
				type ScreenActions = typeof screen['actions'][number];

				return (
					screenActions: Record<
						ScreenActions,
						keyof typeof steps | (() => TFlowScreenActionCallbackResult | void)
					>
				): void => {
					Object.keys(screenActions).forEach(action => {
						const gotoScreen = (screenActions as any)[action];

						this.log('step', {
							screens: this.screens,
							steps,
							name,
							gotoScreen,
							screenActions,
						});

						flow.addAction(name as any, action, gotoScreen);
					});

					this.log('flow final', {
						flow,
					});
				};
			},
			anotherObject: <TCurrentStepName extends keyof TAnotherObjects>(name: TCurrentStepName) => {
				const anotherObject = this.anotherObjects[name];
				type AnotherObjectsActions = typeof anotherObject['actions'][number];

				return (
					actions: Record<
						AnotherObjectsActions,
						keyof typeof steps | (() => TFlowScreenActionCallbackResult | void)
					>
				): void => {
					Object.keys(actions).forEach(action => {
						const gotoScreen = (actions as any)[action];

						this.log('anotherObject', {
							screens: this.screens,
							steps,
							name,
							gotoScreen,
							actions,
						});

						flow.addAction(name as any, action, gotoScreen, true);
					});

					this.log('flow final', {
						flow,
					});
				};
			},
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			listen: (input: TFlowListenCallback | { callback: TFlowListenCallback; type: TFlowListen }) => {
				if (typeof input === 'function') {
					const params: any = input;
					return flow.addListener(params, 'all');
				} else {
					const params: any = input;
					return flow.addListener(params.callback, params.type);
				}
			},
			start: <TStepName extends keyof typeof steps>(
				stepName?: TStepName,
				options?: TFlowActionOptions
			): TFlowManagerStartMethodOutput => {
				return {
					flowName,
					stepName: stepName as any,
					options,
				};
			},
			navigateTo: <TStepName extends keyof typeof steps>(
				stepName?: TStepName,
				options?: TFlowActionOptions
				// eslint-disable-next-line sonarjs/no-identical-functions
			): TFlowScreenActionCallbackResult => {
				return {
					flowName,
					stepName: stepName as any,
					options,
				};
			},
			name: () => flowName,
		};
	};

	/**
	 * Allow clear history for all flows when not passed specific flow (flowName param) or clear only for specific flow
	 *
	 * @param flowName	flow name of flow to clear history
	 */
	clearAllHistory = (flowName?: string): void => {
		if (flowName) {
			const flow = this.getFlow(flowName);

			this.log('clearAllHistory', {
				flow,
				flowName,
			});

			flow?.clearHistory();
		} else {
			Object.keys(this.flows).forEach(flow => {
				this.log('clearAllHistory', {
					flow,
				});

				this.getFlow(flow).clearHistory();
			});
		}
	};
}
