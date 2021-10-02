export class CoreHelper {
	static getValueOrDefault = <TValue extends any>(value: TValue, defaultValue: TValue): TValue => {
		return value === undefined ? defaultValue : value;
	};

	static getPropertyValue = <TCollection extends Record<string, any>>(
		obj: TCollection,
		propName: string,
		defaultValue?: any
	): any => {
		return CoreHelper.getValueOrDefault(obj.hasOwnProperty(propName) ? obj[propName] : undefined, defaultValue);
	};
}
