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

export type TFlowManagerContext = {
	fm: FlowManager<any, any, any>;
	currentFlowName: string;
	start: (flowName: string, stepName?: string) => void;
	back: () => void;
	dispatch: (name: string, payload?: TFlowActionPayload) => void;
	refresh: () => void;
};

export type TStepAction = string | (() => void);

export type TStepOptions = {
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

export type TFlowListen = 'all' | 'mount' | 'back' | 'dispatch';

export type TFlowListenCallbackInputDispatch = {
	actionName?: string;
	payload?: TFlowActionPayload;
};

export type TFlowListenCallbackInput = {
	lastStepName?: string;
	currentStepName: string;
	type: TFlowListen;
	dispatch?: TFlowListenCallbackInputDispatch;
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

export type TFlowDispatchMethodOutput = TFlowBaseActionMethodOutput;

export type TFlowScreenActionCallbackResult = {
	flowName: string;
	stepName: string;
};

export type TFlowManagerStartMethodOutput = {
	flowName: string;
	stepName?: string;
};
