// O repo usa @types/node 14, que não declara `node:test`. Declaração mínima para o spike.
declare module 'node:test' {
	export function describe(name: string, fn: () => void): void;
	export function it(name: string, fn: () => void | Promise<void>): void;
	export function it(name: string, options: { skip?: string | boolean }, fn?: () => void): void;
	export function beforeEach(fn: () => void | Promise<void>): void;
	export function afterEach(fn: () => void | Promise<void>): void;
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

// jsdom 14 (já existe no repo, sem @types). Declaração mínima para o spike.
declare module 'jsdom' {
	export class JSDOM {
		constructor(html: string, options?: { url?: string; pretendToBeVisual?: boolean });
		window: Window & typeof globalThis;
	}
}

// O repo não tem @types/react-dom. Declaração mínima para o spike.
declare module 'react-dom/client' {
	import type { ReactNode } from 'react';
	export type Root = { render(children: ReactNode): void; unmount(): void };
	export function createRoot(container: Element): Root;
}
