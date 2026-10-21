import type { FlowApp } from './app';
import type { AnyTransition } from './types';

export type GraphNode = {
	id: string;
	flow: string;
	step: string;
	screen: string;
	initial: boolean;
	entrypoint: boolean;
	actions: string[];
};

export type GraphEdge = {
	/** Identificador único da aresta no diagrama. */
	id: string;
	/** Chave de cobertura: `flow.step:action->destino` (as arestas de exit partilham a chave). */
	key: string;
	from: string;
	to: string;
	action: string;
	kind: 'direct' | 'branch' | 'cross-flow' | 'exit';
};

export type FlowGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type FlowIssue = {
	code:
		| 'no-initial-step'
		| 'unhandled-action'
		| 'unknown-target'
		| 'unreachable-step'
		| 'exit-without-caller'
		| 'unknown-action';
	where: string;
	message: string;
};

const nodeId = (flow: string, step: string): string => `${flow}.${step}`;

export const targetKey = (target: AnyTransition): string => {
	if (typeof target === 'string') return target;
	if (target.kind === 'goto') return `${target.flow}.${target.step}`;
	if (target.kind === 'exit') return 'exit';
	return 'branch';
};

export const edgeKey = (flow: string, step: string, action: string, target: string): string =>
	`${flow}.${step}:${action}->${target}`;

const actionsOf = (actions: readonly string[] | Record<string, unknown>): string[] =>
	Array.isArray(actions) ? [...actions] : Object.keys(actions);

/** Extrai o grafo de todos os flows sem executar nenhum `resolve` de `branch`. */
export function toGraph(app: FlowApp): FlowGraph {
	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];
	const exits: Array<{ from: string; flow: string; action: string; key: string }> = [];

	for (const flow of app.flows) {
		const entries = Object.entries(flow.steps);
		const hasInitial = entries.some(([, opts]) => opts.initial);

		entries.forEach(([step, opts], index) => {
			nodes.push({
				id: nodeId(flow.name, step),
				flow: flow.name,
				step,
				screen: opts.screen.name,
				initial: opts.initial ?? (!hasInitial && index === 0),
				entrypoint: opts.entrypoint ?? false,
				actions: actionsOf(opts.screen.actions as never),
			});

			for (const [action, transition] of Object.entries(flow._transitions[step] ?? {})) {
				const from = nodeId(flow.name, step);
				const isBranch = typeof transition !== 'string' && transition.kind === 'branch';
				const targets = isBranch ? (transition.targets as AnyTransition[]) : [transition];

				for (const target of targets) {
					const key = edgeKey(flow.name, step, action, targetKey(target));

					if (typeof target === 'string') {
						edges.push({ id: key, key, from, to: nodeId(flow.name, target), action, kind: isBranch ? 'branch' : 'direct' });
					} else if (target.kind === 'goto') {
						edges.push({ id: key, key, from, to: nodeId(target.flow, target.step), action, kind: 'cross-flow' });
					} else if (target.kind === 'exit') {
						exits.push({ from, flow: flow.name, action, key });
					}
				}
			}
		});
	}

	// Um exit volta a cada passo que abre este flow a partir de outro flow.
	for (const exit of exits) {
		const callers = edges.filter(
			edge => edge.kind === 'cross-flow' && edge.to.startsWith(`${exit.flow}.`) && !edge.from.startsWith(`${exit.flow}.`)
		);
		for (const caller of callers) {
			edges.push({ id: `${exit.key}@${caller.from}`, key: exit.key, from: exit.from, to: caller.from, action: exit.action, kind: 'exit' });
		}
		if (callers.length === 0) {
			edges.push({ id: exit.key, key: exit.key, from: exit.from, to: 'exit', action: exit.action, kind: 'exit' });
		}
	}

	return { nodes, edges };
}

export function toMermaid(graph: FlowGraph, direction: 'LR' | 'TB' = 'LR'): string {
	const id = (node: string): string => node.replace(/[^\w]/g, '_');
	const lines = [`graph ${direction}`];
	const flows = [...new Set(graph.nodes.map(node => node.flow))];

	for (const flow of flows) {
		lines.push(`  subgraph ${flow}`);
		for (const node of graph.nodes.filter(n => n.flow === flow)) {
			lines.push(`    ${id(node.id)}${node.initial ? `((${node.step}))` : `[${node.step}]`}`);
		}
		lines.push('  end');
	}

	for (const edge of graph.edges) {
		const arrow = edge.kind === 'cross-flow' || edge.kind === 'exit' ? '-.->' : '-->';
		const label = edge.kind === 'exit' ? `${edge.action} ↩` : edge.action;
		lines.push(`  ${id(edge.from)} ${arrow}|${label}| ${id(edge.to)}`);
	}

	return lines.join('\n');
}

/** Validação estática para correr em testes/CI. */
export function validateFlows(app: FlowApp): FlowIssue[] {
	const issues: FlowIssue[] = [];
	const graph = toGraph(app);
	const nodeIds = new Set(graph.nodes.map(node => node.id));

	for (const flow of app.flows) {
		if (!Object.values(flow.steps).some(opts => opts.initial)) {
			issues.push({ code: 'no-initial-step', where: flow.name, message: `O flow "${flow.name}" não marca nenhum passo como initial` });
		}

		for (const [step, opts] of Object.entries(flow.steps)) {
			const declared = actionsOf(opts.screen.actions as never);
			const handled = Object.keys(flow._transitions[step] ?? {});
			const where = `${flow.name}.${step}`;

			for (const action of declared.filter(a => !handled.includes(a))) {
				issues.push({ code: 'unhandled-action', where, message: `A ação "${action}" do ecrã "${opts.screen.name}" não tem transição` });
			}
			for (const action of handled.filter(a => !declared.includes(a))) {
				issues.push({ code: 'unknown-action', where, message: `Transição para a ação "${action}", que o ecrã não declara` });
			}
		}
	}

	for (const edge of graph.edges) {
		if (edge.to !== 'exit' && !nodeIds.has(edge.to)) {
			issues.push({ code: 'unknown-target', where: edge.from, message: `Destino inexistente: ${edge.to}` });
		}
		if (edge.kind === 'exit' && edge.to === 'exit') {
			issues.push({ code: 'exit-without-caller', where: edge.from, message: 'goto.exit() num flow que nenhum outro flow abre' });
		}
	}

	const roots = graph.nodes.filter(node => node.initial || node.entrypoint).map(node => node.id);
	const reachable = new Set(roots);
	const queue = [...roots];
	while (queue.length > 0) {
		const from = queue.shift() as string;
		for (const edge of graph.edges.filter(e => e.from === from && !reachable.has(e.to))) {
			reachable.add(edge.to);
			queue.push(edge.to);
		}
	}
	for (const node of graph.nodes.filter(n => !reachable.has(n.id))) {
		issues.push({ code: 'unreachable-step', where: node.id, message: 'Passo inalcançável a partir dos passos iniciais e entrypoints' });
	}

	return issues;
}

export type FlowPath = { target: string; steps: Array<{ from: string; action: string; to: string; key: string }> };

/** Caminho mais curto (BFS) desde `from` até cada passo alcançável. */
export function getPaths(app: FlowApp, from: string): FlowPath[] {
	const graph = toGraph(app);
	const previous = new Map<string, GraphEdge>();
	const visited = new Set([from]);
	const queue = [from];

	while (queue.length > 0) {
		const node = queue.shift() as string;
		for (const edge of graph.edges.filter(e => e.from === node && !visited.has(e.to) && e.to !== 'exit')) {
			visited.add(edge.to);
			previous.set(edge.to, edge);
			queue.push(edge.to);
		}
	}

	return [...previous.keys()].map(target => {
		const steps: FlowPath['steps'] = [];
		for (let node = target; previous.has(node); node = (previous.get(node) as GraphEdge).from) {
			const edge = previous.get(node) as GraphEdge;
			steps.unshift({ from: edge.from, action: edge.action, to: edge.to, key: edge.key });
		}
		return { target, steps };
	});
}
