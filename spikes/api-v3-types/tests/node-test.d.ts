// O repo usa @types/node 14, que não declara `node:test`. Declaração mínima para o spike.
declare module 'node:test' {
	export function describe(name: string, fn: () => void): void;
	export function it(name: string, fn: () => void | Promise<void>): void;
	export const mock: {
		method<T extends object, K extends keyof T>(
			object: T,
			key: K,
			implementation?: (...args: any[]) => any
		): { mock: { callCount(): number; restore(): void } };
	};
}

declare module 'node:assert/strict' {
	import assert = require('assert');
	export default assert;
}
