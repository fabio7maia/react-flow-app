import { describe, expect, it } from "vitest";
import type { FlowDefinition, FlowDiagram, ScreenConfig } from "../../types/core";
import { generateMermaid, toMermaid } from "../mermaid";

const mockLoader = () => Promise.resolve({ default: () => null as any });

describe("toMermaid", () => {
	const diagram: FlowDiagram = {
		nodes: [
			{
				id: "auth_login",
				flowName: "auth",
				stepName: "login",
				actions: ["submit"],
				options: { initialStep: true },
				isInitial: true,
			},
			{
				id: "auth_dashboard",
				flowName: "auth",
				stepName: "dashboard",
				actions: ["logout"],
				options: {},
				isInitial: false,
			},
		],
		edges: [{ from: "auth_login", to: "auth_dashboard", action: "submit", isCrossFlow: false }],
	};

	it("starts with graph direction", () => {
		const result = toMermaid(diagram);
		expect(result).toMatch(/^graph LR/);
	});

	it("uses custom direction", () => {
		const result = toMermaid(diagram, { direction: "TB" });
		expect(result).toMatch(/^graph TB/);
	});

	it("includes subgraphs when groupByFlow is true", () => {
		const result = toMermaid(diagram, { groupByFlow: true });
		expect(result).toContain("subgraph auth");
	});

	it("does not include subgraphs when groupByFlow is false", () => {
		const result = toMermaid(diagram, { groupByFlow: false });
		expect(result).not.toContain("subgraph");
	});

	it("includes action labels on edges", () => {
		const result = toMermaid(diagram, { includeActions: true });
		expect(result).toContain("|submit|");
	});

	it("omits action labels when includeActions is false", () => {
		const result = toMermaid(diagram, { includeActions: false });
		expect(result).not.toContain("|submit|");
	});

	it("uses dashed arrows for cross-flow edges", () => {
		const crossFlowDiagram: FlowDiagram = {
			...diagram,
			edges: [
				{
					from: "auth_login",
					to: "main_home",
					action: "goMain",
					isCrossFlow: true,
				},
			],
		};
		const result = toMermaid(crossFlowDiagram);
		expect(result).toContain("-..->");
	});

	it("uses solid arrows for intra-flow edges", () => {
		const result = toMermaid(diagram);
		expect(result).toContain("-->");
	});

	it("uses circle notation for initial nodes", () => {
		const result = toMermaid(diagram, { groupByFlow: false });
		expect(result).toContain("((login))");
	});

	it("uses bracket notation for non-initial nodes", () => {
		const result = toMermaid(diagram, { groupByFlow: false });
		expect(result).toContain("[dashboard]");
	});
});

describe("generateMermaid", () => {
	const screens: Record<string, ScreenConfig> = {
		login: { actions: ["submit"] as const, loader: mockLoader },
		dashboard: { actions: ["logout"] as const, loader: mockLoader },
	};

	const flows: Record<string, FlowDefinition> = {
		auth: {
			name: "auth",
			steps: { login: { initialStep: true }, dashboard: {} },
			transitions: { login: { submit: "dashboard" } },
			__brand: "Flow",
		},
	};

	it("generates mermaid from flows and screens", () => {
		const result = generateMermaid(flows, screens);
		expect(result).toContain("graph");
		expect(result).toContain("auth_login");
		expect(result).toContain("auth_dashboard");
	});
});
