import type { FlowGraph, GraphDiff, GraphEdge, GraphNode } from 'react-flow-app';

/**
 * O grafo (`toGraph`) desenhado como um mapa de linhas: cada flow é uma linha, cada passo uma
 * estação. É só dados, por isso qualquer ferramenta (devtools, docs, revisão de PR) o pode desenhar.
 */
type Props = {
	graph: FlowGraph;
	/** Passo atual (`flow.step`). */
	current?: string | null;
	/** Chaves de cobertura das transições já percorridas. */
	covered?: ReadonlySet<string>;
	lastEdge?: { from: string; action: string; to: string } | null;
	diff?: GraphDiff;
	/** Arestas removidas (desenhadas a tracejado no modo de revisão). */
	removedEdges?: GraphEdge[];
	removedNodes?: GraphNode[];
	label: string;
};

const LANE_H = 116;
const COL_W = 150;
const LEFT = 168;
const TOP = 8;
const R = 13;

type Point = { x: number; y: number };

export function Diagram({ graph, current, covered, lastEdge, diff, removedEdges = [], removedNodes = [], label }: Props) {
	const nodes = [...graph.nodes, ...removedNodes];
	const edges = [...graph.edges, ...removedEdges];
	const flows = [...new Set(nodes.map(node => node.flow))];
	const lineOf = (flow: string): string => `var(--line-${(flows.indexOf(flow) % 4) + 1})`;

	const position = new Map<string, Point>();
	for (const [lane, flow] of flows.entries()) {
		nodes
			.filter(node => node.flow === flow)
			.forEach((node, col) => position.set(node.id, { x: LEFT + col * COL_W, y: TOP + lane * LANE_H + LANE_H / 2 + 6 }));
	}
	const columns = Math.max(...flows.map(flow => nodes.filter(node => node.flow === flow).length));
	const width = LEFT + (columns - 1) * COL_W + 70;
	const height = TOP * 2 + flows.length * LANE_H;

	// Arestas entre o mesmo par de nós afastam-se umas das outras (referencial canónico do par).
	const pairs = new Map<string, GraphEdge[]>();
	for (const edge of edges) {
		const key = [edge.from, edge.to].sort().join('|');
		pairs.set(key, [...(pairs.get(key) ?? []), edge]);
	}

	const added = new Set(diff?.addedEdges.map(edge => edge.id));
	const removed = new Set(removedEdges.map(edge => edge.id));
	const nodeState = (id: string): 'added' | 'removed' | 'changed' | undefined =>
		diff?.addedNodes.some(node => node.id === id)
			? 'added'
			: removedNodes.some(node => node.id === id)
			? 'removed'
			: diff?.changedNodes.some(node => node.id === id)
			? 'changed'
			: undefined;

	const geometry = (edge: GraphEdge) => {
		const a = position.get(edge.from);
		const b = position.get(edge.to);
		if (!a || !b) return null;
		if (edge.from === edge.to) {
			const d = `M ${a.x - 8} ${a.y - R} C ${a.x - 30} ${a.y - 62}, ${a.x + 30} ${a.y - 62}, ${a.x + 8} ${a.y - R}`;
			return { d, label: { x: a.x, y: a.y - 52 } };
		}
		const key = [edge.from, edge.to].sort().join('|');
		const group = pairs.get(key) as GraphEdge[];
		const [p, q] = edge.from < edge.to ? [a, b] : [b, a];
		const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
		const normal = { x: -(q.y - p.y) / length, y: (q.x - p.x) / length };
		const sameLane = Math.abs(p.y - q.y) < 1;
		const skip = sameLane ? Math.round(Math.abs(q.x - p.x) / COL_W) - 1 : 0;
		// Na mesma linha, saltar estações curva por cima delas.
		const bias = sameLane ? (normal.y > 0 ? -1 : 1) * 46 * skip : 0;
		const offset = bias + (group.indexOf(edge) - (group.length - 1) / 2) * (sameLane ? 30 : 40);
		const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
		const control = { x: mid.x + normal.x * offset * 2, y: mid.y + normal.y * offset * 2 };
		const trim = (from: Point, toward: Point, by: number): Point => {
			const dx = toward.x - from.x;
			const dy = toward.y - from.y;
			const len = Math.hypot(dx, dy) || 1;
			return { x: from.x + (dx / len) * by, y: from.y + (dy / len) * by };
		};
		const start = trim(a, control, R + 3);
		const end = trim(b, control, R + 7);
		const labelAt = { x: 0.25 * a.x + 0.5 * control.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * control.y + 0.25 * b.y };
		// Arestas paralelas na vertical: as etiquetas ficam em alturas diferentes para não se sobreporem.
		if (!sameLane && group.length > 1 && Math.abs(q.x - p.x) < COL_W) labelAt.y += (group.indexOf(edge) - (group.length - 1) / 2) * 16;
		return { d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`, label: labelAt };
	};

	const edgeText = (edge: GraphEdge): string =>
		edge.kind === 'exit' ? `${edge.action} ↩` : edge.resume ? `${edge.action} ⟲` : edge.kind === 'effect' ? `${edge.action} ⚙` : edge.action;

	const isLast = (edge: GraphEdge): boolean =>
		!!lastEdge && edge.from === lastEdge.from && edge.to === lastEdge.to && edge.action === lastEdge.action;

	return (
		<div className="diagram-scroll">
			<svg className="diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ minWidth: width * 0.8 }}>
				<defs>
					{['line-1', 'line-2', 'line-3', 'line-4', 'added', 'removed'].map(token => (
						<marker key={token} id={`arrow-${token}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
							<path d="M 0 1 L 9 5 L 0 9 z" fill={`var(--${token})`} />
						</marker>
					))}
				</defs>

				{flows.map((flow, lane) => (
					<g key={flow}>
						<rect className="lane" x={4} y={TOP + lane * LANE_H + 4} width={width - 8} height={LANE_H - 8} rx={10} />
						<rect x={14} y={TOP + lane * LANE_H + 14} width={flow.length * 8.4 + 18} height={22} rx={11} fill={lineOf(flow)} />
						<text className="lane-label" x={23} y={TOP + lane * LANE_H + 29}>
							{flow}
						</text>
					</g>
				))}

				{edges.map(edge => {
					const geo = geometry(edge);
					if (!geo) return null;
					const fromFlow = edge.from.split('.')[0];
					const state = added.has(edge.id) ? 'added' : removed.has(edge.id) ? 'removed' : undefined;
					const color = state ? `var(--${state})` : lineOf(fromFlow);
					const marker = state ?? `line-${(flows.indexOf(fromFlow) % 4) + 1}`;
					const walked = covered?.has(edge.key);
					const classes = [
						'edge',
						edge.kind === 'cross-flow' || edge.kind === 'exit' ? 'edge-cross' : '',
						covered ? (walked ? 'edge-walked' : 'edge-idle') : '',
						isLast(edge) ? 'edge-last' : '',
						state ? `edge-${state}` : '',
					].join(' ');
					return (
						<g key={edge.id} className={classes}>
							<path d={geo.d} stroke={color} fill="none" markerEnd={`url(#arrow-${marker})`} />
							<text className="edge-label" x={geo.label.x} y={geo.label.y + 3} textAnchor="middle">
								{edgeText(edge)}
							</text>
						</g>
					);
				})}

				{nodes.map(node => {
					const at = position.get(node.id) as Point;
					const isCurrent = current === node.id;
					const state = nodeState(node.id);
					return (
						<g key={node.id} className={['station', isCurrent ? 'station-current' : '', state ? `station-${state}` : ''].join(' ')}>
							{isCurrent && <circle className="station-pulse" cx={at.x} cy={at.y} r={R + 8} stroke={lineOf(node.flow)} />}
							{node.initial && <circle cx={at.x} cy={at.y} r={R + 4} fill="none" stroke={lineOf(node.flow)} strokeWidth={1.5} />}
							{node.overlay ? (
								<rect x={at.x - R} y={at.y - R} width={R * 2} height={R * 2} rx={5} className="station-dot" stroke={lineOf(node.flow)} />
							) : (
								<circle cx={at.x} cy={at.y} r={R} className="station-dot" stroke={lineOf(node.flow)} style={isCurrent ? { fill: lineOf(node.flow) } : undefined} />
							)}
							{node.entrypoint && (
								<text className="station-badge" x={at.x + R + 3} y={at.y - R + 2}>
									↗
								</text>
							)}
							<text className="station-label" x={at.x} y={at.y + R + 17} textAnchor="middle">
								{node.step}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
