import React from 'react';
import { useLoggerFlow } from '../../hooks';
import { FlowManager } from '../../models';
import { Flow } from '../../models/flow';
import {
	DEFAULT_FLOW_MANAGER_OPTIONS,
	TFlowActionOptions,
	TFlowListenCallbackInput,
	TFlowManagerContext,
	TFlowManagerOptions,
	TScreen,
} from '../../types';

export const flowManagerContext = React.createContext<TFlowManagerContext>({
	fm: undefined,
	currentFlowName: '',
	options: {
		animation: false,
		withUrl: false,
	},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	start: (flowName: string, stepName?: string, options?: TFlowActionOptions): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	back: (): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	dispatch: (screen: TScreen, name: string, payload?: Record<string, any>): void => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	refresh: (): void => {},
});

export type FlowProviderLifeCycleHandlers<TFlows> = Partial<Record<keyof TFlows, () => void>>;

type TDictionary = Record<string, any>;

interface FlowProviderProps<TFlows extends TDictionary> {
	fm: FlowManager<any, any, any, any>;
	initialFlowName: keyof TFlows;
	initialStepName?: string;
	initialHistory?: Array<string>;
	options?: TFlowManagerOptions;
	/**
	 * List of handlers by flows called when specific flow name is mounted
	 */
	onFlowMount?: FlowProviderLifeCycleHandlers<Partial<TFlows>>;
	/**
	 * List of handlers by flows called when specific flow name is unmounted
	 */
	onFlowUnmount?: FlowProviderLifeCycleHandlers<Partial<TFlows>>;
	children?: React.ReactNode;
	listen?: (input: TFlowListenCallbackInput) => void;
}

export const FlowProvider = <TFlows extends TDictionary>({
	fm,
	initialFlowName,
	children,
	initialStepName,
	options,
	onFlowMount,
	onFlowUnmount,
	listen,
	initialHistory,
}: // eslint-disable-next-line sonarjs/cognitive-complexity
FlowProviderProps<TFlows>) => {
	const [_, setForceUpdate] = React.useState(0);
	const currentFlowName = React.useRef<string>(initialFlowName as string);
	const flow = React.useRef<Flow>(fm.getFlow(currentFlowName.current as string));
	const logger = useLoggerFlow();
	const initialized = React.useRef(false);
	const {
		animation = DEFAULT_FLOW_MANAGER_OPTIONS.animation,
		withUrl = DEFAULT_FLOW_MANAGER_OPTIONS.withUrl,
		scrollRestoration = DEFAULT_FLOW_MANAGER_OPTIONS.scrollRestoration,
	} = options || DEFAULT_FLOW_MANAGER_OPTIONS;
	const parsedOptions: TFlowManagerOptions = {
		animation,
		withUrl,
		scrollRestoration,
	};
	const lastFlowName = React.useRef<string>(undefined);
	const initialHistoryRef = React.useRef<string[]>(initialHistory || []);
	const listenSubscriptions = React.useRef<Array<() => void>>([]);

	const forceUpdate = React.useCallback(() => {
		flow.current = fm.getFlow(currentFlowName.current);

		if (document.startViewTransition) {
			document.startViewTransition(() => {
				setForceUpdate(val => val + 1);
			});
		} else {
			setForceUpdate(val => val + 1);
		}
	}, [fm]);

	const updateLocationUrl = React.useCallback(
		(url: string): void => {
			if (!withUrl) {
				return;
			}

			logger.log('FlowProvider > updateLocationUrl', { url: `#${url}` });

			url && window.history.replaceState(null, null, `#${url}`);
		},
		[logger, withUrl]
	);

	const subscribeListenersForAllFlows = () => {
		if (!listen) {
			return;
		}

		Object.keys(fm.flows).forEach(flowName => {
			const flow = fm.getFlow(flowName);

			const cb = flow?.addListener(listen, 'all');

			if (cb) {
				listenSubscriptions.current.push(cb);
			}
		});
	};

	React.useState(() => {
		subscribeListenersForAllFlows();
	});

	React.useEffect(() => {
		return () => {
			// unsubscribe listen for all flows when unmount provider
			listenSubscriptions.current.forEach(unsubscribe => unsubscribe());
		};
	}, []);

	const handleStart = React.useCallback(
		(
			flowName: string,
			stepName?: string,
			options?: TFlowActionOptions,
			fromFlowName?: string,
			ignoreFromFlow = false,
			isFromBack = false
		): boolean => {
			logger.log('FlowProvider > handleStart', { flowName });

			const flow = fm.getFlow(flowName);

			// assumed value passed or current flow name when not set to ignore
			fromFlowName = fromFlowName ? fromFlowName : ignoreFromFlow ? undefined : currentFlowName.current;

			let fromFlowData;

			if (fromFlowName) {
				const fromFlow = fm.getFlow(fromFlowName);

				fromFlowData = { flowName: fromFlow.name, stepName: fromFlow.getCurrentStep()?.name };
			}

			const masterOptions = options || { clearHistory: false, history: [] };
			if (initialHistoryRef.current.length > 0) {
				masterOptions.history =
					(masterOptions.history?.length || 0) > 0 ? masterOptions.history : initialHistoryRef.current;
				initialHistoryRef.current = [];
			}

			const { changed, historyUrl, currentFlowName: actionFlowName } =
				flow?.start(stepName, fromFlowData, masterOptions, isFromBack, parsedOptions) || {};

			if (changed) {
				// when action flow name is different current flow name, call start again to another flow
				if (actionFlowName && actionFlowName !== flowName) {
					const { fromFlow } = fm.getFlow(actionFlowName);
					const fromFlowName = fromFlow?.flowName;

					return handleStart(actionFlowName, undefined, undefined, fromFlowName, true, isFromBack);
				}

				currentFlowName.current = flowName;
				updateLocationUrl(historyUrl);

				forceUpdate();
			}

			return changed;
		},
		[fm, forceUpdate, logger, updateLocationUrl]
	);

	const handleBack = React.useCallback(() => {
		const { changed, currentFlowName: actionFlowName, currentStepName, historyUrl, scrollPosition } =
			flow.current?.back(parsedOptions) || {};

		logger.log('FlowProvider > back', { changed, currentFlowName });

		const updateScrollPosition = () => {
			setTimeout(() => {
				if (scrollPosition !== undefined) {
					window.scrollTo({ behavior: 'smooth', top: scrollPosition });
				}
			}, 300);
		};

		if (changed && actionFlowName !== currentFlowName.current) {
			const { fromFlow } = fm.getFlow(actionFlowName);
			const fromFlowName = fromFlow?.flowName;

			const changed = handleStart(actionFlowName, currentStepName, undefined, fromFlowName, true, true);

			if (changed) {
				updateScrollPosition();
			}
		} else if (changed) {
			updateLocationUrl(historyUrl);

			forceUpdate();

			updateScrollPosition();
		}
	}, [fm, forceUpdate, handleStart, logger, updateLocationUrl]);

	const handleDispatch = React.useCallback(
		(screen: TScreen, name: string, payload?: Record<string, any>) => {
			const { changed, currentFlowName: actionFlowName, currentStepName, historyUrl, clearHistory } =
				flow.current?.dispatch(screen, name, payload, parsedOptions) || {};

			logger.log('FlowProvider > dispatch', { name, payload, changed });

			if (actionFlowName && actionFlowName !== currentFlowName.current) {
				// when clear history get fromFlowName of goto flow to keep history correct
				// because clear history allow to forget passed from current flow
				if (clearHistory) {
					const { fromFlow } = fm.getFlow(actionFlowName);
					const fromFlowName = fromFlow?.flowName;

					return handleStart(actionFlowName, currentStepName, undefined, fromFlowName);
				} else {
					return handleStart(actionFlowName, currentStepName);
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
		handleStart(currentFlowName.current, initialStepName);
	}

	const flowManagerContextValue = React.useMemo(
		() => ({
			fm,
			currentFlowName: flow.current?.name,
			start: handleStart,
			back: handleBack,
			dispatch: handleDispatch,
			refresh: handleRefresh,
			options: parsedOptions,
		}),
		[fm, handleBack, handleDispatch, handleRefresh, handleStart, parsedOptions]
	);

	React.useEffect(() => {
		// call unmount handler for last flow
		if (lastFlowName.current && lastFlowName.current !== currentFlowName.current && onFlowUnmount) {
			const handler = onFlowUnmount[lastFlowName.current];

			handler?.();
		}

		// call mount handler for current flow
		if ((!lastFlowName.current || lastFlowName.current !== currentFlowName.current) && onFlowMount) {
			lastFlowName.current = currentFlowName.current;
			const handler = onFlowMount[currentFlowName.current];

			handler?.();
		}
	}, [_, fm, onFlowMount, onFlowUnmount]);

	logger.log('FlowProvider', {
		flow: flow.current,
		currentFlowName: currentFlowName.current,
		lastFlowName: lastFlowName.current,
	});

	return (
		<flowManagerContext.Provider value={flowManagerContextValue}>
			{children ? children : flow.current?.render(parsedOptions)}
		</flowManagerContext.Provider>
	);
};
