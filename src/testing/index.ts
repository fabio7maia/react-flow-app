import {
	type FlowApp,
	type FlowGraph,
	type FlowIssue,
	type GraphEdge,
	type GraphNode,
	toGraph,
	toMermaid,
	validateFlows,
} from 'react-flow-app';

// ─── Generated paths ──────────────────────────────────────────────────────────

export type FlowPath = {
	target: string;
	/** `payload`: the sample declared in the `branch` (or `undefined` for direct transitions). */
	steps: Array<{ from: string; action: string; to: string; key: string; payload?: unknown }>;
};

/** Shortest path (BFS) from `from` to every reachable step: one generated test per step. */
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
			steps.unshift({ from: edge.from, action: edge.action, to: edge.to, key: edge.key, payload: edge.sample });
		}
		return { target, steps };
	});
}

// ─── Graph snapshot and diff (`react-flow-app check`) ─────────────────────────

export type NodeChange = { id: string; changes: string[] };

export type GraphDiff = {
	addedNodes: GraphNode[];
	removedNodes: GraphNode[];
	changedNodes: NodeChange[];
	addedEdges: GraphEdge[];
	removedEdges: GraphEdge[];
};

/** The snapshot kept in the repo: stable (sorted) so the git diff stays readable. */
export type GraphSnapshot = { version: 1; nodes: GraphNode[]; edges: Array<Omit<GraphEdge, 'sample'>> };

export function toSnapshot(graph: FlowGraph): GraphSnapshot {
	const byId = <T extends { id: string }>(a: T, b: T): number => a.id.localeCompare(b.id);
	return {
		version: 1,
		nodes: [...graph.nodes].sort(byId),
		// Sample payloads are test data, not structure: they stay out of the snapshot.
		edges: graph.edges.map(({ sample: _sample, ...edge }) => edge).sort(byId),
	};
}

const describeNode = (before: GraphNode, after: GraphNode): string[] => {
	const changes: string[] = [];
	if (before.screen !== after.screen) changes.push(`screen ${before.screen} → ${after.screen}`);
	if (before.initial !== after.initial) changes.push(after.initial ? 'became initial' : 'no longer initial');
	if (before.entrypoint !== after.entrypoint) changes.push(after.entrypoint ? 'became an entrypoint' : 'no longer an entrypoint');
	const added = after.actions.filter(action => !before.actions.includes(action));
	const removed = before.actions.filter(action => !after.actions.includes(action));
	if (added.length) changes.push(`new actions: ${added.join(', ')}`);
	if (removed.length) changes.push(`removed actions: ${removed.join(', ')}`);
	return changes;
};

export function diffGraphs(before: FlowGraph, after: FlowGraph): GraphDiff {
	const beforeNodes = new Map(before.nodes.map(node => [node.id, node]));
	const afterNodes = new Map(after.nodes.map(node => [node.id, node]));
	const beforeEdges = new Set(before.edges.map(edge => edge.id));
	const afterEdges = new Set(after.edges.map(edge => edge.id));

	return {
		addedNodes: after.nodes.filter(node => !beforeNodes.has(node.id)),
		removedNodes: before.nodes.filter(node => !afterNodes.has(node.id)),
		changedNodes: after.nodes
			.filter(node => beforeNodes.has(node.id))
			.map(node => ({ id: node.id, changes: describeNode(beforeNodes.get(node.id) as GraphNode, node) }))
			.filter(change => change.changes.length > 0),
		addedEdges: after.edges.filter(edge => !beforeEdges.has(edge.id)),
		removedEdges: before.edges.filter(edge => !afterEdges.has(edge.id)),
	};
}

export const isEmptyDiff = (diff: GraphDiff): boolean => Object.values(diff).every((list: unknown[]) => list.length === 0);

/**
 * Mermaid of the current graph with the changes highlighted: green = new, red dashed = removed,
 * yellow = changed step. Removed nodes and edges are drawn so the reviewer sees what went away.
 */
export function toMermaidDiff(before: FlowGraph, after: FlowGraph, direction: 'LR' | 'TB' = 'LR'): string {
	const diff = diffGraphs(before, after);
	const merged: FlowGraph = {
		nodes: [...after.nodes, ...diff.removedNodes],
		edges: [...after.edges, ...diff.removedEdges],
	};
	const id = (node: string): string => node.replace(/[^\w]/g, '_');
	const lines = [toMermaid(merged, direction)];

	lines.push('  classDef added fill:#dafbe1,stroke:#1a7f37,stroke-width:2px');
	lines.push('  classDef removed fill:#ffebe9,stroke:#cf222e,stroke-dasharray:4 3');
	lines.push('  classDef changed fill:#fff8c5,stroke:#9a6700');
	for (const node of diff.addedNodes) lines.push(`  class ${id(node.id)} added`);
	for (const node of diff.removedNodes) lines.push(`  class ${id(node.id)} removed`);
	for (const node of diff.changedNodes) lines.push(`  class ${id(node.id)} changed`);

	// `linkStyle` uses the position of the edge in the diagram (the order toMermaid writes them in).
	const added = new Set(diff.addedEdges.map(edge => edge.id));
	const removed = new Set(diff.removedEdges.map(edge => edge.id));
	merged.edges.forEach((edge, index) => {
		if (added.has(edge.id)) lines.push(`  linkStyle ${index} stroke:#1a7f37,stroke-width:3px`);
		if (removed.has(edge.id)) lines.push(`  linkStyle ${index} stroke:#cf222e,stroke-dasharray:4 3`);
	});

	return lines.join('\n');
}

const edgeLabel = (edge: Omit<GraphEdge, 'sample'>): string => `\`${edge.from}\` —${edge.action}→ \`${edge.to}\``;

/** Summary for a PR comment (GitHub markdown, with the diagram rendered). */
export function diffToMarkdown(before: FlowGraph, after: FlowGraph, issues: FlowIssue[] = []): string {
	const diff = diffGraphs(before, after);
	const out: string[] = ['### Flows'];

	if (isEmptyDiff(diff)) {
		out.push('', 'No navigation changes.');
	} else {
		const section = (title: string, items: string[]): void => {
			if (items.length) out.push('', `**${title}**`, ...items.map(item => `- ${item}`));
		};
		section(
			'New steps',
			diff.addedNodes.map(node => `\`${node.id}\` (${node.screen})`)
		);
		section(
			'Removed steps',
			diff.removedNodes.map(node => `\`${node.id}\``)
		);
		section(
			'Changed steps',
			diff.changedNodes.map(node => `\`${node.id}\`: ${node.changes.join('; ')}`)
		);
		section('New transitions', diff.addedEdges.map(edgeLabel));
		section('Removed transitions', diff.removedEdges.map(edgeLabel));
		out.push('', '```mermaid', toMermaidDiff(before, after), '```');
	}

	const errors = issues.filter(issue => issue.severity === 'error');
	const warnings = issues.filter(issue => issue.severity === 'warning');
	if (issues.length) {
		out.push('', `**Validation:** ${errors.length} error(s), ${warnings.length} warning(s)`);
		out.push(...issues.map(issue => `- ${issue.severity === 'error' ? '❌' : '⚠️'} \`${issue.where}\` ${issue.message}`));
	}
	return out.join('\n');
}

export type CheckResult = {
	ok: boolean;
	issues: FlowIssue[];
	graph: FlowGraph;
	snapshot: GraphSnapshot;
	/** The snapshot kept in the repo no longer matches the flows (run the check with `--write`). */
	stale: boolean;
	/** Present when there is a base graph (e.g. the snapshot of the base branch). */
	report?: string;
};

/** Validation + snapshot + diff against a base: what `react-flow-app check` runs. Pure (no fs/git). */
export function check(app: FlowApp, options: { committed?: GraphSnapshot; base?: GraphSnapshot; strict?: boolean } = {}): CheckResult {
	const graph = toGraph(app);
	const snapshot = toSnapshot(graph);
	const issues = validateFlows(app);
	const failing = issues.filter(issue => issue.severity === 'error' || options.strict);
	const stale = options.committed !== undefined && JSON.stringify(options.committed) !== JSON.stringify(snapshot);

	return {
		ok: failing.length === 0 && !stale,
		issues,
		graph,
		snapshot,
		stale,
		report: options.base ? diffToMarkdown(options.base, snapshot, issues) : undefined,
	};
}
