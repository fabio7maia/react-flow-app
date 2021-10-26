import React from 'react';
import { LoggerHelper } from '../../helpers';

type UseLoggerInput = string;

interface UseLoggerOutput {
	error: (msg: string, args: any) => void;
	log: (msg: string, args: any) => void;
	warn: (msg: string, args: any) => void;
}

export const useLogger = (group: UseLoggerInput): UseLoggerOutput => {
	return React.useCallback(
		() => ({
			error: LoggerHelper.error(group),
			log: LoggerHelper.log(group),
			warn: LoggerHelper.error(group),
		}),
		[group]
	)();
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useLoggerFlow = () => useLogger('Flow');
