import { CoreHelper } from '../../helpers';
import { Logger, LoggerType } from '../../types';

export class LoggerHelper {
	private static _groups: Record<string, boolean | Logger> = {
		all: false,
	};

	private static isGroupActive = ({ group, type }: { group: string; type?: LoggerType }): boolean => {
		const all = CoreHelper.getPropertyValue(LoggerHelper._groups, 'all', false);
		const allByType = CoreHelper.getPropertyValue(all, type);

		const value = CoreHelper.getPropertyValue(LoggerHelper._groups, group, false);
		const valueByType = CoreHelper.getPropertyValue(value, type);

		return allByType !== undefined
			? allByType
			: all !== undefined && typeof all === 'boolean'
			? all
			: valueByType !== undefined
			? valueByType
			: value;
	};

	private static treatLogger = (type: LoggerType) => (group: string) => (msg: string, ...args: any): void => {
		if (!LoggerHelper.isGroupActive({ group, type })) {
			return;
		}

		try {
			// eslint-disable-next-line no-console
			console[type].apply(msg, [new Date().toUTCString(), msg, ...args]);
		} catch (err) {
			if (!LoggerHelper.isGroupActive({ group, type: 'error' })) {
				return;
			}

			// eslint-disable-next-line no-console
			console.error('LoggerHelper > treatLogger', err);
		}
	};

	static init = (groups: Record<string, boolean | Logger>): void => {
		LoggerHelper._groups = {
			...LoggerHelper._groups,
			...groups,
		};
	};

	static error = LoggerHelper.treatLogger('error');

	static log = LoggerHelper.treatLogger('log');

	static warn = LoggerHelper.treatLogger('warn');
}
