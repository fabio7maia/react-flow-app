export class CoreHelper {
	static isUndefined = <TValue extends any>(value: TValue): boolean => {
		return value === undefined;
	};

	static getValueOrDefault = <TValue extends any>(value: TValue, defaultValue: TValue): TValue => {
		return CoreHelper.isUndefined(value) ? defaultValue : value;
	};
}
