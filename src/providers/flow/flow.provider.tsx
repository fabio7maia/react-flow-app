import React from 'react';
import { BrowserRouter as Router, useHistory } from 'react-router-dom';
import { FlowManager } from '@react-flow-app/models';
import { TFlowManagerContext } from '@react-flow-app/types';
import { Flow } from '../../models/flow';
import { useLoggerFlow } from '@react-flow-app/hooks';

export const flowManagerContext = React.createContext<TFlowManagerContext>({
	currentFlowName: '',
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	start: (flowName: string, stepName?: string): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	back: (): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	dispatch: (name: string, payload?: Record<string, any>): void => {},
});

interface FlowProviderProps {
	fm: FlowManager<any, any, any>;
}

const FlowProviderInner: React.FC<FlowProviderProps> = ({ fm, children }) => {
	const [_, setForceUpdate] = React.useState(0);
	const currentFlowName = React.useRef('');
	const flow = React.useRef<Flow>();
	const history = useHistory();
	const logger = useLoggerFlow();
	// const [state, setState] = React.useState({
	// 	tick: 0,
	// 	currentFlowName: '',
	// 	currentStepName: '',
	// });

	// const flow = FlowManager.getFlow(currentFlowName);

	const forceUpdate = React.useCallback(() => {
		flow.current = fm.getFlow(currentFlowName.current);

		setForceUpdate(val => val + 1);
	}, []);

	const handleStart = React.useCallback(
		(flowName: string, stepName?: string, ignoreFromFlow?: boolean): void => {
			logger.log('FlowProvider > handleStart', { flowName });

			const flow = fm.getFlow(flowName);

			const {
				changed,
				history: { url: historyUrl },
			} = flow?.start(stepName, ignoreFromFlow ? undefined : currentFlowName.current);

			if (changed) {
				currentFlowName.current = flowName;
				history.replace(historyUrl);

				forceUpdate();
			}
		},
		[forceUpdate]
	);

	const handleBack = React.useCallback(() => {
		const {
			changed,
			currentFlowName: actionFlowName,
			currentStepName,
			history: { url: historyUrl },
		} = flow.current?.back();

		logger.log('FlowProvider > back', { changed, currentFlowName });

		if (changed && actionFlowName !== currentFlowName.current) {
			handleStart(actionFlowName, currentStepName, true);
		} else if (changed) {
			history.replace(historyUrl);

			forceUpdate();
		}
	}, [forceUpdate, handleStart]);

	const handleDispatch = React.useCallback(
		(name: string, payload?: Record<string, any>) => {
			const {
				changed,
				currentFlowName,
				currentStepName,
				history: { status: historyStatus, url: historyUrl },
			} = flow.current?.dispatch(name, payload);

			logger.log('FlowProvider > dispatch', { name, payload, changed });

			if (currentFlowName) {
				handleStart(currentFlowName, currentStepName);
			} else {
				changed && forceUpdate();
			}

			// if (historyStatus.indexOf('push') >= 0) {
			// 	history.push(historyUrl);
			// } else if (historyStatus.indexOf('ignore') >= 0) {
			// 	history.replace(historyUrl);
			// }
			history.replace(historyUrl);
		},
		[forceUpdate, handleStart]
	);

	logger.log('FlowProvider', { flow: flow.current });

	return (
		<flowManagerContext.Provider
			value={{
				currentFlowName: flow.current?.name,
				start: handleStart,
				back: handleBack,
				dispatch: handleDispatch,
			}}
		>
			{children}
			{flow.current?.render()}
		</flowManagerContext.Provider>
	);
};

export const FlowProvider: React.FC<FlowProviderProps> = ({ fm, children }) => {
	return (
		<Router>
			<FlowProviderInner fm={fm}>{children}</FlowProviderInner>
		</Router>
	);
};
