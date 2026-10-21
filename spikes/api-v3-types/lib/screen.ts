import type { ActionsInput, PayloadMarker, RegisteredMeta, ScreenDef, ScreenLoader } from './types';

/** Declara o payload de uma ação: `actions: { pay: payload<{ ok: boolean }>() }`. */
export const payload = <T>(): PayloadMarker<T> => ({ kind: 'payload' }) as PayloadMarker<T>;

/**
 * Declara um ecrã no seu próprio ficheiro. Deve ficar separado do componente
 * (que é carregado em lazy pelo `loader`), para que os flows possam importar a
 * definição sem carregar UI.
 */
export function defineScreen<const N extends string, const A extends ActionsInput>(def: {
	name: N;
	actions: A;
	meta?: RegisteredMeta;
	loader: ScreenLoader;
}): ScreenDef<N, A> {
	return { kind: 'screen', ...def };
}
