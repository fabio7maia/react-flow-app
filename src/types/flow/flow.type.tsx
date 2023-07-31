import React from 'react';
import { FlowManager } from '../../models';

export type TScreen = {
	actions: any; // needs to any type to working properly to infer actions
	loader: () => React.LazyExoticComponent<React.ComponentType<any>>;
	url?: string;
};

export type TScreens = Record<string, TScreen>;

export type TFlowCreatorInput<TFlowName extends string> = {
	name: TFlowName;
	baseUrl: string;
};

export type TFlowActionPayload = Record<string, any>;

export type TFlowActionOptions = {
	/**
	 * Set true to clear all steps saved in history to not allow back
	 *
	 * Default: false
	 */
	clearHistory?: boolean;
};

export interface TFlowManagerOptions {
	/**
	 * Allow customize and disable animation in lazy loading
	 *
	 * Default: true
	 */
	animation?: boolean | React.ReactNode;
	/**
	 * Allow to set of manipulate or not the url.
	 *
	 * Default: true
	 */
	withUrl?: boolean;
}

export const DEFAULT_FLOW_MANAGER_OPTIONS: TFlowManagerOptions = {
	animation: true,
	withUrl: true,
};

export type TFlowManagerContext = {
	fm: FlowManager<any, any, any>;
	currentFlowName: string;
	options: TFlowManagerOptions;
	start: (flowName: string, stepName?: string, options?: TFlowActionOptions) => void;
	back: () => void;
	dispatch: (screen: TScreen, name: string, payload?: TFlowActionPayload) => void;
	refresh: () => void;
};

export type TStepAction = string | (() => void);

export type TStepOptions = {
	/**
	 * Mark this step with initial step of flow. When more than 1 step is marked the first is considered and others is ignored.
	 */
	initialStep?: boolean;
	/**
	 * Set the url for step. Allow using pass and catch route params, using ':' character
	 *
	 * Default: assumed name of step
	 */
	url?: string;
	/**
	 * Set true to not add current step in history when navigate
	 *
	 * Default: false
	 */
	ignoreHistory?: boolean;
	/**
	 * Set true to clear all steps saved in history to not allow back
	 *
	 * Default: false
	 */
	clearHistory?: boolean;
	/**
	 * Set true to allow cyclic history
	 *
	 * Default: false
	 */
	allowCyclicHistory?: boolean;
	/**
	 * Set true to mark step with checkpoint
	 *
	 * Default: false
	 */
	checkpoint?: boolean;
};

export type TFlowHistoryStatus = 'clear' | 'push' | 'ignore' | 'clearAndPush' | 'clearAndIgnore' | 'none';

export type TFlowListen = 'all' | 'mount' | 'back' | 'backExit' | 'dispatch';

export type TFlowListenCallbackInputDispatch = {
	actionName?: string;
	payload?: TFlowActionPayload;
};

export type TFlowListenCallbackInputOptions = Pick<TStepOptions, 'clearHistory' | 'ignoreHistory'>;

export type TFlowListenCallbackInput = {
	url: string;
	flowName: string;
	currentStepName: string;
	type: TFlowListen;
	dispatch?: TFlowListenCallbackInputDispatch;
	options?: TFlowListenCallbackInputOptions;
};

export type TFlowListenCallback = (input: TFlowListenCallbackInput) => void;

export type TFlowBaseActionMethodOutput = {
	changed: boolean;
	currentFlowName?: string;
	currentStepName?: string;
	historyUrl?: string;
};

export type TFlowStartMethodOutput = TFlowBaseActionMethodOutput;

export type TFlowBackMethodOutput = TFlowBaseActionMethodOutput;

export type TFlowDispatchMethodOutput = TFlowBaseActionMethodOutput &
	Pick<TStepOptions, 'clearHistory' | 'ignoreHistory'>;

export type TFlowScreenActionCallbackResultOptions = TFlowActionOptions;

export type TFlowScreenActionCallbackResult = {
	flowName: string;
	stepName?: string;
	options?: TFlowActionOptions;
};

export type TFlowManagerStartMethodInput = {
	flowName: string;
	stepName?: string;
	options?: TFlowActionOptions;
};

export type TFlowManagerStartMethodOutput = {
	flowName: string;
	stepName?: string;
	options?: TFlowActionOptions;
};

export type TFlowLastAction = 'back' | 'dispatch';
