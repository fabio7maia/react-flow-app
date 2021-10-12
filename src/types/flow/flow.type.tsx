import React from 'react';

export type TScreen = {
	actions: any; // needs to any type to working properly to infer actions
	loader: () => React.LazyExoticComponent<React.ComponentType<any>>;
	url?: string;
};

export type TScreens = Record<string, TScreen>;

export type TFlowManagerContext = {
	currentFlowName: string;
	start: (flowName: string) => void;
	back: () => void;
	dispatch: (name: string, payload?: Record<string, any>) => void;
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

export type TFlowWatch = 'all' | 'mount' | 'dispatch' | 'unmount';
export type TFlowWatchCallbackInput = {
	oldStepName?: string;
	currentStepName: string;
};
export type TFlowWatchCallback = (input: TFlowWatchCallbackInput) => void;
