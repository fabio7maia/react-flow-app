import type { FlowApp } from './app';
import type { AnyTransition } from './types';

export type GraphNode = {
	id: string;
	flow: string;
	/** Step name, or `@overlay` for overlays. */
	step: string;
	overlay: boolean;
	screen: string;
	initial: boolean;
	entrypoint: boolean;
	actions: string[];
};

export type GraphEdge = {
	/** Unique id of the edge in the diagram. */
	id: string;
	/** Coverage key: `flow.step:action->target` (exit edges share their key). */
	key: string;
	from: string;
	to: string;
	action: string;
	kind: 'direct' | 'branch' | 'cross-flow' | 'exit' | 'effect';
	/** `goto(flow)` without a step: resumes the flow (drawn to its initial step). */
	resume?: boolean;
	/** Edge of a `branch`. */
	branch?: boolean;
	/** Sample payload that leads the `branch` to this edge (when declared). */
	sample?: unknown;
};

export type FlowGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type FlowIssue = {
	code:
		| 'no-initial-step'
		| 'unhandled-action'
		| 'unknown-target'
		| 'unreachable-step'
		| 'exit-without-caller'
		| 'unknown-action'
		| 'branch-without-sample';
	/** `warning` does not break the app, but limits what generated tests can walk. */
	severity: 'error' | 'warning';
	where: string;
	message: string;
};

const nodeId = (flow: string, step: string): string => `${flow}.${step}`;

export const targetKey = (target: AnyTransition): string => {
	if (typeof target === 'string') return target;
	if (target.kind === 'goto') return `${target.flow}.${target.step ?? '*'}`;
	if (target.kind === 'exit') return 'exit';
	if (target.kind === 'effect') return 'effect';
	return 'branch';
};

export const edgeKey = (flow: string, step: string, action: string, target: string): string => `${flow}.${step}:${action}->${target}`;

const actionsOf = (actions: readonly string[] | Record<string, unknown>): string[] =>
	Array.isArray(actions) ? [...actions] : Object.keys(actions);

/** Extracts the graph of every flow without running any `branch` resolver. */
export function toGraph(app: FlowApp): FlowGraph {
	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];
	const exits: Array<{ from: string; flow: string; action: string; key: string; extra: Partial<GraphEdge> }> = [];

	const initialOf = (flowName: string): string => {
		const flow = app.getFlow(flowName);
		const entries = Object.entries(flow?.steps ?? {});
		return entries.find(([, opts]) => opts.initial)?.[0] ?? entries[0]?.[0] ?? '';
	};

	for (const flow of app.flows) {
		const entries = Object.entries(flow.steps);
		const hasInitial = entries.some(([, opts]) => opts.initial);
		const sources = [
			...entries.map(([step, opts], index) => ({
				key: step,
				node: {
					id: nodeId(flow.name, step),
					flow: flow.name,
					step,
					overlay: false,
					screen: opts.screen.name,
					initial: opts.initial ?? (!hasInitial && index === 0),
					entrypoint: opts.entrypoint ?? false,
					actions: actionsOf(opts.screen.actions as never),
				},
			})),
			...Object.entries(flow.overlays).map(([overlay, screen]) => ({
				key: overlay,
				node: {
					id: nodeId(flow.name, `@${overlay}`),
					flow: flow.name,
					step: `@${overlay}`,
					overlay: true,
					screen: screen.name,
					initial: false,
					entrypoint: false,
					actions: actionsOf(screen.actions as never),
				},
			})),
		];

		for (const { key: source, node } of sources) {
			nodes.push(node);
			const step = node.step;

			for (const [action, transition] of Object.entries(flow._transitions[source] ?? {})) {
				const from = node.id;
				const isBranch = typeof transition !== 'string' && transition.kind === 'branch';
				const targets = isBranch ? (transition.targets as AnyTransition[]) : [transition];

				for (const target of targets) {
					const key = edgeKey(flow.name, step, action, targetKey(target));
					const samples = isBranch ? (transition.samples ?? {}) : {};
					const extra: Partial<GraphEdge> = isBranch
						? { branch: true, ...(targetKey(target) in samples ? { sample: samples[targetKey(target)] } : {}) }
						: {};

					if (typeof target === 'string') {
						edges.push({
							id: key,
							key,
							from,
							to: nodeId(flow.name, target),
							action,
							kind: isBranch ? 'branch' : 'direct',
							...extra,
						});
					} else if (target.kind === 'goto') {
						const to = nodeId(target.flow, target.step ?? initialOf(target.flow));
						edges.push({ id: key, key, from, to, action, kind: 'cross-flow', resume: target.step === undefined, ...extra });
					} else if (target.kind === 'exit') {
						exits.push({ from, flow: flow.name, action, key, extra });
					} else if (target.kind === 'effect') {
						edges.push({ id: key, key, from, to: from, action, kind: 'effect' });
					}
				}
			}
		}
	}

	// An exit goes back to every step that opens this flow from another flow.
	for (const exit of exits) {
		const callers = edges.filter(
			edge => edge.kind === 'cross-flow' && edge.to.startsWith(`${exit.flow}.`) && !edge.from.startsWith(`${exit.flow}.`)
		);
		for (const caller of callers) {
			edges.push({
				id: `${exit.key}@${caller.from}`,
				key: exit.key,
				from: exit.from,
				to: caller.from,
				action: exit.action,
				kind: 'exit',
				...exit.extra,
			});
		}
		if (callers.length === 0) {
			edges.push({ id: exit.key, key: exit.key, from: exit.from, to: 'exit', action: exit.action, kind: 'exit', ...exit.extra });
		}
	}

	return { nodes, edges };
}

/**
 * Mermaid diagram of the graph. `((step))` initial, `{{@overlay}}` overlay, `-.->` between flows,
 * `↩` goto.exit(), `⚙` effect, `⟲` resumes the flow.
 */
export function toMermaid(graph: FlowGraph, direction: 'LR' | 'TB' = 'LR'): string {
	const id = (node: string): string => node.replace(/[^\w]/g, '_');
	const lines = [`graph ${direction}`];
	const flows = [...new Set(graph.nodes.map(node => node.flow))];

	for (const flow of flows) {
		lines.push(`  subgraph ${flow}`);
		for (const node of graph.nodes.filter(n => n.flow === flow)) {
			const shape = node.overlay ? `{{${node.step}}}` : node.initial ? `((${node.step}))` : `[${node.step}]`;
			lines.push(`    ${id(node.id)}${shape}`);
		}
		lines.push('  end');
	}

	for (const edge of graph.edges) {
		const arrow = edge.kind === 'cross-flow' || edge.kind === 'exit' ? '-.->' : '-->';
		const label =
			edge.kind === 'exit'
				? `${edge.action} ↩`
				: edge.kind === 'effect'
					? `${edge.action} ⚙`
					: edge.resume
						? `${edge.action} ⟲`
						: edge.action;
		lines.push(`  ${id(edge.from)} ${arrow}|${label}| ${id(edge.to)}`);
	}

	return lines.join('\n');
}

/** Static validation, for tests and CI. */
export function validateFlows(app: FlowApp): FlowIssue[] {
	const issues: FlowIssue[] = [];
	const graph = toGraph(app);
	const nodeIds = new Set(graph.nodes.map(node => node.id));

	for (const flow of app.flows) {
		if (!Object.values(flow.steps).some(opts => opts.initial)) {
			issues.push({
				severity: 'error',
				code: 'no-initial-step',
				where: flow.name,
				message: `Flow "${flow.name}" does not mark any step as initial`,
			});
		}

		const sources = [
			...Object.entries(flow.steps).map(([step, opts]) => ({ key: step, where: step, screen: opts.screen })),
			...Object.entries(flow.overlays).map(([overlay, screen]) => ({ key: overlay, where: `@${overlay}`, screen })),
		];

		for (const { key, where: local, screen } of sources) {
			const declared = actionsOf(screen.actions as never);
			const handled = Object.keys(flow._transitions[key] ?? {});
			const where = `${flow.name}.${local}`;

			for (const action of declared.filter(a => !handled.includes(a))) {
				issues.push({
					severity: 'error',
					code: 'unhandled-action',
					where,
					message: `Action "${action}" of screen "${screen.name}" has no transition`,
				});
			}
			for (const action of handled.filter(a => !declared.includes(a))) {
				issues.push({
					severity: 'error',
					code: 'unknown-action',
					where,
					message: `Transition for action "${action}", which the screen does not declare`,
				});
			}
		}
	}

	for (const edge of graph.edges) {
		if (edge.to !== 'exit' && !nodeIds.has(edge.to)) {
			issues.push({ severity: 'error', code: 'unknown-target', where: edge.from, message: `Unknown target: ${edge.to}` });
		}
		if (edge.kind === 'exit' && edge.to === 'exit') {
			issues.push({
				severity: 'error',
				code: 'exit-without-caller',
				where: edge.from,
				message: 'goto.exit() in a flow that no other flow opens',
			});
		}
	}

	for (const edge of graph.edges.filter(e => e.branch && !('sample' in e))) {
		issues.push({
			severity: 'warning',
			code: 'branch-without-sample',
			where: edge.from,
			message: `The branch of action "${edge.action}" has no sample payload for "${edge.key.split('->')[1]}"`,
		});
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
	for (const node of graph.nodes.filter(n => !n.overlay && !reachable.has(n.id))) {
		issues.push({
			severity: 'error',
			code: 'unreachable-step',
			where: node.id,
			message: 'Step unreachable from the initial steps and entrypoints',
		});
	}

	return issues;
}
