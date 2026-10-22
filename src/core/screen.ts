import type { ActionsInput, PayloadMarker, RegisteredMeta, ScreenDef, ScreenLoader } from './types';

/** Declares the payload of an action: `actions: { pay: payload<{ ok: boolean }>() }`. */
export const payload = <T>(): PayloadMarker<T> => ({ kind: 'payload' }) as PayloadMarker<T>;

/**
 * Declares a screen in its own file. Keep it apart from the component (lazy loaded by `loader`),
 * so flows can import the definition without loading any UI.
 */
export function defineScreen<const N extends string, const A extends ActionsInput>(def: {
	name: N;
	actions: A;
	meta?: RegisteredMeta;
	loader: ScreenLoader;
}): ScreenDef<N, A> {
	return { kind: 'screen', ...def };
}
