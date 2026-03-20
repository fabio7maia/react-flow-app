import type { DiagramOptions, FlowDefinition, FlowDiagram, ScreenConfig } from "../types/core";
import { extractGraph } from "./extractGraph";

/**
 * Generates a Mermaid diagram string from a flow diagram.
 */
export function toMermaid(diagram: FlowDiagram, options: DiagramOptions = {}): string {
	const { direction = "LR", groupByFlow = true, includeActions = true } = options;

	const lines: string[] = [`graph ${direction}`];

	if (groupByFlow) {
		// Group nodes by flow using subgraphs
		const flowGroups = new Map<string, typeof diagram.nodes>();
		for (const node of diagram.nodes) {
			if (!flowGroups.has(node.flowName)) {
				flowGroups.set(node.flowName, []);
			}
			flowGroups.get(node.flowName)?.push(node);
		}

		for (const [flowName, nodes] of flowGroups.entries()) {
			lines.push(`  subgraph ${flowName}["${capitalize(flowName)} Flow"]`);
			for (const node of nodes) {
				const label = node.isInitial ? `((${node.stepName}))` : `[${node.stepName}]`;
				lines.push(`    ${node.id}${label}`);
			}
			lines.push("  end");
		}
	} else {
		for (const node of diagram.nodes) {
			const label = node.isInitial ? `((${node.stepName}))` : `[${node.stepName}]`;
			lines.push(`  ${node.id}${label}`);
		}
	}

	// Edges
	for (const edge of diagram.edges) {
		const edgeLabel = includeActions ? `|${edge.action}|` : "";
		const edgeStyle = edge.isCrossFlow ? "-..->" : "-->";
		lines.push(`  ${edge.from} ${edgeStyle}${edgeLabel} ${edge.to}`);
	}

	return lines.join("\n");
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generates a Mermaid diagram from flow registry + screen registry.
 */
export function generateMermaid(
	flows: Record<string, FlowDefinition>,
	screens: Record<string, ScreenConfig>,
	options?: DiagramOptions
): string {
	const diagram = extractGraph(flows, screens);
	return toMermaid(diagram, options);
}
