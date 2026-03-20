import React, { useMemo } from "react";
import type { DiagramNode, FlowDiagram } from "../types/core";

type FlowDiagramViewProps = {
	diagram: FlowDiagram;
	/** Currently active node ID (e.g. "auth_login") */
	currentNodeId?: string;
	/** Called when a node is clicked */
	onNodeClick?: (node: DiagramNode) => void;
	/** Show action labels on edges */
	showActions?: boolean;
	/** Theme */
	theme?: "default" | "dark" | "minimal";
	/** Style override for the container */
	style?: React.CSSProperties;
	className?: string;
};

const THEMES = {
	default: {
		background: "#f5f5f5",
		nodeDefault: "#4a90d9",
		nodeInitial: "#27ae60",
		nodeActive: "#e74c3c",
		text: "#fff",
		edge: "#666",
		edgeActive: "#e74c3c",
		borderRadius: "8px",
	},
	dark: {
		background: "#1a1a2e",
		nodeDefault: "#16213e",
		nodeInitial: "#0f3460",
		nodeActive: "#e94560",
		text: "#eee",
		edge: "#aaa",
		edgeActive: "#e94560",
		borderRadius: "8px",
	},
	minimal: {
		background: "#fff",
		nodeDefault: "#333",
		nodeInitial: "#555",
		nodeActive: "#000",
		text: "#fff",
		edge: "#999",
		edgeActive: "#000",
		borderRadius: "4px",
	},
} as const;

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;
const MARGIN_X = 60;
const MARGIN_Y = 60;
const NODES_PER_ROW = 4;

/**
 * Simple interactive flow diagram rendered as SVG.
 * For production use, integrate with a proper graph layout library.
 */
export function FlowDiagramView({
	diagram,
	currentNodeId,
	onNodeClick,
	showActions = true,
	theme = "default",
	style,
	className,
}: FlowDiagramViewProps) {
	const colors = THEMES[theme];

	// Simple grid layout
	const nodePositions = useMemo(() => {
		const positions = new Map<string, { x: number; y: number }>();
		diagram.nodes.forEach((node, i) => {
			const col = i % NODES_PER_ROW;
			const row = Math.floor(i / NODES_PER_ROW);
			positions.set(node.id, {
				x: col * (NODE_WIDTH + MARGIN_X) + MARGIN_X,
				y: row * (NODE_HEIGHT + MARGIN_Y) + MARGIN_Y,
			});
		});
		return positions;
	}, [diagram.nodes]);

	const rows = Math.ceil(diagram.nodes.length / NODES_PER_ROW);
	const svgWidth = NODES_PER_ROW * (NODE_WIDTH + MARGIN_X) + MARGIN_X;
	const svgHeight = rows * (NODE_HEIGHT + MARGIN_Y) + MARGIN_Y;

	return (
		<div
			className={className}
			style={{
				background: colors.background,
				borderRadius: "12px",
				padding: "16px",
				overflow: "auto",
				...style,
			}}
			data-testid="flow-diagram-view"
		>
			<svg
				width={svgWidth}
				height={svgHeight}
				viewBox={`0 0 ${svgWidth} ${svgHeight}`}
				aria-label="Flow diagram"
				role="img"
			>
				<defs>
					<marker
						id="arrowhead"
						markerWidth="10"
						markerHeight="7"
						refX="10"
						refY="3.5"
						orient="auto"
					>
						<polygon points="0 0, 10 3.5, 0 7" fill={colors.edge} />
					</marker>
				</defs>

				{/* Edges */}
				{diagram.edges.map((edge) => {
					const from = nodePositions.get(edge.from);
					const to = nodePositions.get(edge.to);
					if (!from || !to) return null;

					const x1 = from.x + NODE_WIDTH / 2;
					const y1 = from.y + NODE_HEIGHT / 2;
					const x2 = to.x + NODE_WIDTH / 2;
					const y2 = to.y + NODE_HEIGHT / 2;
					const mx = (x1 + x2) / 2;
					const my = (y1 + y2) / 2;
					const isActive = edge.from === currentNodeId || edge.to === currentNodeId;

					return (
						<g key={`${edge.from}-${edge.action}-${edge.to}`}>
							<line
								x1={x1}
								y1={y1}
								x2={x2}
								y2={y2}
								stroke={isActive ? colors.edgeActive : colors.edge}
								strokeWidth={isActive ? 2 : 1}
								strokeDasharray={edge.isCrossFlow ? "4 4" : undefined}
								markerEnd="url(#arrowhead)"
							/>
							{showActions && (
								<text
									x={mx}
									y={my - 6}
									textAnchor="middle"
									fontSize="10"
									fill={isActive ? colors.edgeActive : colors.edge}
								>
									{edge.action}
								</text>
							)}
						</g>
					);
				})}

				{/* Nodes */}
				{diagram.nodes.map((node) => {
					const pos = nodePositions.get(node.id);
					if (!pos) return null;

					const isActive = node.id === currentNodeId;
					const isInitial = node.isInitial;
					const fill = isActive
						? colors.nodeActive
						: isInitial
							? colors.nodeInitial
							: colors.nodeDefault;

					const interactiveProps = onNodeClick
						? {
								onClick: () => onNodeClick(node),
								role: "button" as const,
								tabIndex: 0,
								onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => {
									if (e.key === "Enter" || e.key === " ") {
										onNodeClick(node);
									}
								},
							}
						: {};

					return (
						<g
							key={node.id}
							transform={`translate(${pos.x}, ${pos.y})`}
							style={{ cursor: onNodeClick ? "pointer" : "default" }}
							aria-label={`${node.flowName}: ${node.stepName}${isActive ? " (current)" : ""}`}
							{...interactiveProps}
						>
							<rect
								width={NODE_WIDTH}
								height={NODE_HEIGHT}
								rx={isInitial ? "50%" : colors.borderRadius}
								ry={isInitial ? "50%" : colors.borderRadius}
								fill={fill}
								stroke={isActive ? colors.nodeActive : "transparent"}
								strokeWidth={2}
							/>
							<text
								x={NODE_WIDTH / 2}
								y={NODE_HEIGHT / 2}
								dominantBaseline="middle"
								textAnchor="middle"
								fontSize="12"
								fill={colors.text}
								fontWeight={isActive ? "bold" : "normal"}
							>
								{node.stepName}
							</text>
							{node.flowName && (
								<text
									x={NODE_WIDTH / 2}
									y={NODE_HEIGHT - 8}
									dominantBaseline="middle"
									textAnchor="middle"
									fontSize="8"
									fill={`${colors.text}88`}
								>
									{node.flowName}
								</text>
							)}
						</g>
					);
				})}
			</svg>
		</div>
	);
}
