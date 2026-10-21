/**
 * DOM (jsdom) para os testes de render React. Tem de ser importado antes do React.
 * Usa o histórico do próprio jsdom: `history.back()` dispara `popstate` de forma assíncrona.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
	url: 'http://localhost/',
	pretendToBeVisual: true,
});

const globals: Record<string, unknown> = {
	window: dom.window,
	document: dom.window.document,
	navigator: dom.window.navigator,
	HTMLElement: dom.window.HTMLElement,
	Node: dom.window.Node,
	MouseEvent: dom.window.MouseEvent,
	IS_REACT_ACT_ENVIRONMENT: true,
};

for (const [name, value] of Object.entries(globals)) {
	Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

export const window_ = dom.window;
