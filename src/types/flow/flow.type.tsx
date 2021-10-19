import { FlowManager } from '@models';
import React from 'react';

export type TScreen = {
	actions: any; // needs to any type to working properly to infer actions
	loader: () => React.LazyExoticComponent<React.ComponentType<any>>;
	url?: string;
};

export type TScreens = Record<string, TScreen>;

export type TFlowActionPayload = Record<string, any>;

export type TFlowManagerContext = {
	currentFlowName: string;
	start: (flowName: string, stepName?: string) => void;
	back: () => void;
	dispatch: (name: string, payload?: TFlowActionPayload) => void;
};

export type TStepAction = string | (() => void);

export type TStepOptions = {
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
};

export type TFlowBackMethodOutput = TFlowBaseActionMethodOutput;

export type TFlowDispatchMethodOutput = TFlowBaseActionMethodOutput;

export type TFlowScreenActionCallbackResult = {
	flowName: string;
	stepName: string;
};

export type TFlowStartMethodOutput = {
	flowName: string;
	stepName?: string;
};

// export type TFlowScreenActionCallbackResult = (
// 	flow: Flow
// ) => <TStepName extends keyof typeof flow.steps>(
// 	stepName: TStepName
// ) => {
// 	flowName: string;
// 	stepName: string;
// };

// export type TFlowScreenActionCallbackResult = <TFlow extends Flow, TStepName extends keyof TFlow['steps']>({
// 	flow: Flow,
// 	stepName: TStepName,
// }) => () => void;

// export type TFlowScreenActionCallbackResult = {
// 	flowName: keyof FlowManager['flows'];
// };
