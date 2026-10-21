import type { FlowApp } from './app';
import { type FlowGraph, type FlowIssue, type GraphEdge, type GraphNode, toGraph, toMermaid, validateFlows } from './graph';

/**
 * `react-flow-app check`: validação + diagrama + diff do grafo face à branch base.
 * Tudo puro (sem fs/git): o script da CLI só lê ficheiros e passa os grafos.
 */

export type NodeChange = { id: string; changes: string[] };

export type GraphDiff = {
	addedNodes: GraphNode[];
	removedNodes: GraphNode[];
	changedNodes: NodeChange[];
	addedEdges: GraphEdge[];
	removedEdges: GraphEdge[];
};

/** O snapshot guardado no repo: estável (ordenado) para o diff do git ser legível. */
export type GraphSnapshot = { version: 1; nodes: GraphNode[]; edges: Array<Omit<GraphEdge, 'sample'>> };

export function toSnapshot(graph: FlowGraph): GraphSnapshot {
	const byId = <T extends { id: string }>(a: T, b: T): number => a.id.localeCompare(b.id);
	return {
		version: 1,
		nodes: [...graph.nodes].sort(byId),
		// Os payloads de exemplo são dados de teste, não estrutura: ficam fora do snapshot.
		edges: graph.edges.map(({ sample: _sample, ...edge }) => edge).sort(byId),
	};
}

const describeNode = (before: GraphNode, after: GraphNode): string[] => {
	const changes: string[] = [];
	if (before.screen !== after.screen) changes.push(`ecrã ${before.screen} → ${after.screen}`);
	if (before.initial !== after.initial) changes.push(after.initial ? 'passou a initial' : 'deixou de ser initial');
	if (before.entrypoint !== after.entrypoint) changes.push(after.entrypoint ? 'passou a entrypoint' : 'deixou de ser entrypoint');
	const added = after.actions.filter(action => !before.actions.includes(action));
	const removed = before.actions.filter(action => !after.actions.includes(action));
	if (added.length) changes.push(`ações novas: ${added.join(', ')}`);
	if (removed.length) changes.push(`ações removidas: ${removed.join(', ')}`);
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

export const isEmptyDiff = (diff: GraphDiff): boolean =>
	Object.values(diff).every((list: unknown[]) => list.length === 0);

/**
 * Mermaid do grafo atual com o que mudou em destaque: verde = novo, vermelho tracejado = removido,
 * amarelo = passo alterado. Os removidos são desenhados para o revisor ver o que desapareceu.
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

	// `linkStyle` usa a posição da aresta no diagrama (a ordem em que o toMermaid as escreve).
	const added = new Set(diff.addedEdges.map(edge => edge.id));
	const removed = new Set(diff.removedEdges.map(edge => edge.id));
	merged.edges.forEach((edge, index) => {
		if (added.has(edge.id)) lines.push(`  linkStyle ${index} stroke:#1a7f37,stroke-width:3px`);
		if (removed.has(edge.id)) lines.push(`  linkStyle ${index} stroke:#cf222e,stroke-dasharray:4 3`);
	});

	return lines.join('\n');
}

const edgeLabel = (edge: Omit<GraphEdge, 'sample'>): string => `\`${edge.from}\` —${edge.action}→ \`${edge.to}\``;

/** Resumo para comentar no PR (markdown do GitHub, com o diagrama renderizado). */
export function diffToMarkdown(before: FlowGraph, after: FlowGraph, issues: FlowIssue[] = []): string {
	const diff = diffGraphs(before, after);
	const out: string[] = ['### Flows'];

	if (isEmptyDiff(diff)) {
		out.push('', 'Sem alterações à navegação.');
	} else {
		const section = (title: string, items: string[]): void => {
			if (items.length) out.push('', `**${title}**`, ...items.map(item => `- ${item}`));
		};
		section('Passos novos', diff.addedNodes.map(node => `\`${node.id}\` (${node.screen})`));
		section('Passos removidos', diff.removedNodes.map(node => `\`${node.id}\``));
		section('Passos alterados', diff.changedNodes.map(node => `\`${node.id}\`: ${node.changes.join('; ')}`));
		section('Transições novas', diff.addedEdges.map(edgeLabel));
		section('Transições removidas', diff.removedEdges.map(edgeLabel));
		out.push('', '```mermaid', toMermaidDiff(before, after), '```');
	}

	const errors = issues.filter(issue => issue.severity === 'error');
	const warnings = issues.filter(issue => issue.severity === 'warning');
	if (issues.length) {
		out.push('', `**Validação:** ${errors.length} erro(s), ${warnings.length} aviso(s)`);
		out.push(...issues.map(issue => `- ${issue.severity === 'error' ? '❌' : '⚠️'} \`${issue.where}\` ${issue.message}`));
	}
	return out.join('\n');
}

export type CheckResult = {
	ok: boolean;
	issues: FlowIssue[];
	graph: FlowGraph;
	snapshot: GraphSnapshot;
	/** O snapshot guardado no repo já não corresponde aos flows (falta correr com `--write`). */
	stale: boolean;
	/** Presente quando há grafo base (ex.: o snapshot da branch base). */
	report?: string;
};

export function check(
	app: FlowApp,
	options: { committed?: GraphSnapshot; base?: GraphSnapshot; strict?: boolean } = {}
): CheckResult {
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
