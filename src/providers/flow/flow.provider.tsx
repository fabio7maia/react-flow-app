import React from 'react';
import { useHistory } from 'react-router-dom';
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
}

export const FlowProvider: React.FC<FlowProviderProps> = ({ fm, children }) => {
	const [_, setForceUpdate] = React.useState(0);
	const currentFlowName = React.useRef('');
	const flow = React.useRef<Flow>();
	const history = useHistory();
	const logger = useLoggerFlow();

	const forceUpdate = React.useCallback(() => {
		flow.current = fm.getFlow(currentFlowName.current);

		setForceUpdate(val => val + 1);
	}, [fm]);

	const handleStart = React.useCallback(
		(flowName: string, stepName?: string, options?: TFlowActionOptions, ignoreFromFlow?: boolean): void => {
			logger.log('FlowProvider > handleStart', { flowName });

			const flow = fm.getFlow(flowName);

			const { changed, historyUrl } = flow?.start(
				stepName,
				ignoreFromFlow ? undefined : currentFlowName.current,
				options
			);

			if (changed) {
				currentFlowName.current = flowName;
				historyUrl && history.replace(historyUrl);

				forceUpdate();
			}
		},
		[fm, forceUpdate, history, logger]
	);

	const handleBack = React.useCallback(() => {
		const { changed, currentFlowName: actionFlowName, currentStepName, historyUrl } = flow.current?.back();

		logger.log('FlowProvider > back', { changed, currentFlowName });

		if (changed && actionFlowName !== currentFlowName.current) {
			handleStart(actionFlowName, currentStepName, undefined, true);
		} else if (changed) {
			history.replace(historyUrl);

			forceUpdate();
		}
	}, [forceUpdate, handleStart, history, logger]);

	const handleDispatch = React.useCallback(
		(name: string, payload?: Record<string, any>) => {
			const { changed, currentFlowName, currentStepName, historyUrl } = flow.current?.dispatch(name, payload);

			logger.log('FlowProvider > dispatch', { name, payload, changed });

			if (currentFlowName) {
				return handleStart(currentFlowName, currentStepName);
			} else {
				changed && forceUpdate();
			}

			historyUrl && history.replace(historyUrl);
		},
		[forceUpdate, handleStart, history, logger]
	);

	const handleRefresh = React.useCallback(() => {
		forceUpdate();
	}, [forceUpdate]);

	logger.log('FlowProvider', { flow: flow.current });

	return (
		<flowManagerContext.Provider
			value={{
				fm,
				currentFlowName: flow.current?.name,
				start: handleStart,
				back: handleBack,
				dispatch: handleDispatch,
				refresh: handleRefresh,
			}}
		>
			{children}
			{flow.current?.render()}
		</flowManagerContext.Provider>
	);
};

// export const FlowProvider: React.FC<FlowProviderProps> = ({ fm, children }) => {
// 	return (
// 		<ErrorBoundary containerErrorMessage={(error: any): React.ReactNode => <UnexpectedError error={error} />}>
// 			<Router>
// 				<FlowProviderInner fm={fm}>{children}</FlowProviderInner>
// 			</Router>
// 		</ErrorBoundary>
// 	);
// };
