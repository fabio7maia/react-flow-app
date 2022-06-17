import React from 'react';
import { FlowManager } from '../../models';
import { TFlowActionOptions, TFlowManagerContext } from '../../types';
import { Flow } from '../../models/flow';
import { useLoggerFlow } from '../../hooks';

export const flowManagerContext = React.createContext<TFlowManagerContext>({
	fm: undefined,
	currentFlowName: '',
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	start: (flowName: string, stepName?: string, options?: TFlowActionOptions): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	back: (): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	dispatch: (name: string, payload?: Record<string, any>): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	refresh: (): void => {},
});

interface FlowProviderProps {
	fm: FlowManager<any, any, any>;
	initialFlowName: string;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export const FlowProvider: React.FC<FlowProviderProps> = ({ fm, initialFlowName, children }) => {
	const [_, setForceUpdate] = React.useState(0);
	const currentFlowName = React.useRef(initialFlowName);
	const flow = React.useRef<Flow>(fm.getFlow(currentFlowName.current));
	const logger = useLoggerFlow();
	const initialized = React.useRef(false);

	const forceUpdate = React.useCallback(() => {
		flow.current = fm.getFlow(currentFlowName.current);

		setForceUpdate(val => val + 1);
	}, [fm]);

	const updateLocationUrl = React.useCallback((url: string): void => {
		url && window.history.replaceState(null, document.title, `/#${url}`);
	}, []);

	const handleStart = React.useCallback(
		(
			flowName: string,
			stepName?: string,
			options?: TFlowActionOptions,
			fromFlowName?: string,
			ignoreFromFlow = false,
			isFromBack = false
		): void => {
			logger.log('FlowProvider > handleStart', { flowName });

			const flow = fm.getFlow(flowName);

			// assumed value passed or current flow name when not set to ignore
			fromFlowName = fromFlowName ? fromFlowName : ignoreFromFlow ? undefined : currentFlowName.current;

			const { changed, historyUrl, currentFlowName: actionFlowName } =
				flow?.start(stepName, fromFlowName, options, isFromBack) || {};

			if (changed) {
				// when action flow name is different current flow name, call start again to another flow
				if (actionFlowName && actionFlowName !== flowName) {
					const { fromFlowName } = fm.getFlow(actionFlowName);

					return handleStart(actionFlowName, undefined, undefined, fromFlowName, true, isFromBack);
				}

				currentFlowName.current = flowName;
				updateLocationUrl(historyUrl);

				forceUpdate();
			}
		},
		[fm, forceUpdate, logger, updateLocationUrl]
	);

	const handleBack = React.useCallback(() => {
		const { changed, currentFlowName: actionFlowName, currentStepName, historyUrl } = flow.current?.back() || {};

		logger.log('FlowProvider > back', { changed, currentFlowName });

		if (changed && actionFlowName !== currentFlowName.current) {
			const { fromFlowName } = fm.getFlow(actionFlowName);

			handleStart(actionFlowName, currentStepName, undefined, fromFlowName, true, true);
		} else if (changed) {
			updateLocationUrl(historyUrl);

			forceUpdate();
		}
	}, [fm, forceUpdate, handleStart, logger, updateLocationUrl]);

	const handleDispatch = React.useCallback(
		(name: string, payload?: Record<string, any>) => {
			const { changed, currentFlowName, currentStepName, historyUrl, clearHistory } =
				flow.current?.dispatch(name, payload) || {};

			logger.log('FlowProvider > dispatch', { name, payload, changed });

			if (currentFlowName) {
				// when clear history get fromFlowName of goto flow to keep history correct
				// because clear history allow to forget passed from current flow
				if (clearHistory) {
					const { fromFlowName } = fm.getFlow(currentFlowName);

					return handleStart(currentFlowName, currentStepName, undefined, fromFlowName);
				} else {
					return handleStart(currentFlowName, currentStepName);
				}
			} else {
				changed && forceUpdate();
			}

			updateLocationUrl(historyUrl);
		},
		[fm, forceUpdate, handleStart, logger, updateLocationUrl]
	);

	const handleRefresh = React.useCallback(() => {
		forceUpdate();
	}, [forceUpdate]);

	if (!initialized.current) {
		initialized.current = true;
		handleStart(currentFlowName.current);
	}

	const flowManagerContextValue = React.useMemo(
		() => ({
			fm,
			currentFlowName: flow.current?.name,
			start: handleStart,
			back: handleBack,
			dispatch: handleDispatch,
			refresh: handleRefresh,
		}),
		[fm, handleBack, handleDispatch, handleRefresh, handleStart]
	);

	logger.log('FlowProvider', { flow: flow.current });

	return (
		<flowManagerContext.Provider value={flowManagerContextValue}>
			{children}
			{flow.current?.render()}
		</flowManagerContext.Provider>
	);
};
