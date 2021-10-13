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
	start: (flowName: string) => void;
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

export type TFlowWatch = 'all' | 'mount' | 'back' | 'dispatch';

export type TFlowWatchCallbackInputDispatch = {
	actionName?: string;
	payload?: TFlowActionPayload;
};

export type TFlowWatchCallbackInput = {
	lastStepName?: string;
	currentStepName: string;
	type: TFlowWatch;
	dispatch?: TFlowWatchCallbackInputDispatch;
};

export type TFlowWatchCallback = (input: TFlowWatchCallbackInput) => void;

export type TFlowBaseActionMethodOutput = {
	changed: boolean;
	currentFlowName?: string;
	currentStepName?: string;
};

export type TFlowBackMethodOutput = TFlowBaseActionMethodOutput;

export type TFlowDispatchMethodOutput = TFlowBaseActionMethodOutput;

export type TFlowScreenActionCallbackResult = Omit<TFlowBaseActionMethodOutput, 'changed'>;
