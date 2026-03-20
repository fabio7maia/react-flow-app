import type {
	DiagramEdge,
	DiagramNode,
	FlowDefinition,
	FlowDiagram,
	NavigationResult,
	ScreenConfig,
} from "../types/core";

/**
 * Extracts a directed graph (nodes + edges) from the flow configuration.
 * This graph can then be used for diagram generation or path enumeration.
 */
export function extractGraph(
	flows: Record<string, FlowDefinition>,
	screens: Record<string, ScreenConfig>
): FlowDiagram {
	const nodes: DiagramNode[] = [];
	const edges: DiagramEdge[] = [];

	for (const [flowName, flow] of Object.entries(flows)) {
		const stepEntries = Object.entries(flow.steps ?? {});

		for (const [stepName, stepOpts] of stepEntries) {
			const screen = screens[stepName];
			const actions = screen?.actions ? [...screen.actions] : [];

			const isInitial =
				stepOpts?.initialStep === true ||
				// First step in flow is implicitly initial if none are explicitly marked
				(stepEntries.every(([, o]) => !o?.initialStep) && stepEntries[0]?.[0] === stepName);

			nodes.push({
				id: `${flowName}_${stepName}`,
				flowName,
				stepName,
				actions,
				options: stepOpts ?? {},
				isInitial,
			});

			// Extract edges from transitions
			const stepTransitions = (
				flow.transitions as Record<string, Record<string, unknown> | undefined>
			)[stepName];

			if (!stepTransitions) continue;

			for (const [actionName, target] of Object.entries(stepTransitions)) {
				if (typeof target === "string") {
					// Intra-flow navigation
					edges.push({
						from: `${flowName}_${stepName}`,
						to: `${flowName}_${target}`,
						action: actionName,
						isCrossFlow: false,
					});
				} else if (typeof target === "function") {
					// Try to evaluate for cross-flow navigation
					try {
						const result = (target as () => NavigationResult | undefined)();
						if (result?.flowName && result.stepName) {
							edges.push({
								from: `${flowName}_${stepName}`,
								to: `${result.flowName}_${result.stepName}`,
								action: actionName,
								isCrossFlow: result.flowName !== flowName,
							});
						}
					} catch {
						// Function may have side effects - skip edge extraction
					}
				}
			}
		}
	}

	return { nodes, edges };
}
