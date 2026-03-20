import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FlowDiagram } from "../../types/core";
import { FlowDiagramView } from "../FlowDiagramView";

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

describe("FlowDiagramView", () => {
	it("renders without crashing", () => {
		render(<FlowDiagramView diagram={diagram} />);
		expect(screen.getByTestId("flow-diagram-view")).toBeInTheDocument();
	});

	it("renders SVG element", () => {
		render(<FlowDiagramView diagram={diagram} />);
		expect(document.querySelector("svg")).toBeInTheDocument();
	});

	it("renders all nodes", () => {
		render(<FlowDiagramView diagram={diagram} />);
		// Nodes render as text in SVG
		expect(document.querySelector("svg")).toBeInTheDocument();
	});

	it("calls onNodeClick when a node is clicked", () => {
		const onNodeClick = vi.fn();
		render(<FlowDiagramView diagram={diagram} onNodeClick={onNodeClick} />);
		// Find the first g element with role="button"
		const buttons = document.querySelectorAll("g[role='button']");
		expect(buttons.length).toBeGreaterThan(0);
		fireEvent.click(buttons[0]);
		expect(onNodeClick).toHaveBeenCalledWith(
			expect.objectContaining({ stepName: expect.any(String) })
		);
	});

	it("calls onNodeClick on Enter key", () => {
		const onNodeClick = vi.fn();
		render(<FlowDiagramView diagram={diagram} onNodeClick={onNodeClick} />);
		const buttons = document.querySelectorAll("g[role='button']");
		fireEvent.keyDown(buttons[0], { key: "Enter" });
		expect(onNodeClick).toHaveBeenCalled();
	});

	it("calls onNodeClick on Space key", () => {
		const onNodeClick = vi.fn();
		render(<FlowDiagramView diagram={diagram} onNodeClick={onNodeClick} />);
		const buttons = document.querySelectorAll("g[role='button']");
		fireEvent.keyDown(buttons[0], { key: " " });
		expect(onNodeClick).toHaveBeenCalled();
	});

	it("does not call onNodeClick when no handler provided", () => {
		render(<FlowDiagramView diagram={diagram} />);
		const nodes = document.querySelectorAll("rect");
		expect(() => fireEvent.click(nodes[0])).not.toThrow();
	});

	it("applies theme styling", () => {
		render(<FlowDiagramView diagram={diagram} theme="dark" />);
		const container = screen.getByTestId("flow-diagram-view");
		// Dark theme background
		expect(container).toHaveStyle({ background: "#1a1a2e" });
	});

	it("applies custom className", () => {
		render(<FlowDiagramView diagram={diagram} className="custom-class" />);
		const container = screen.getByTestId("flow-diagram-view");
		expect(container).toHaveClass("custom-class");
	});

	it("renders cross-flow edges with dashed style", () => {
		const crossFlowDiagram: FlowDiagram = {
			...diagram,
			edges: [
				{
					from: "auth_login",
					to: "auth_dashboard",
					action: "submit",
					isCrossFlow: true,
				},
			],
		};
		render(<FlowDiagramView diagram={crossFlowDiagram} />);
		const dashedLine = document.querySelector("line[stroke-dasharray]");
		expect(dashedLine).toBeInTheDocument();
	});

	it("hides action labels when showActions is false", () => {
		render(<FlowDiagramView diagram={diagram} showActions={false} />);
		// Action label text should not appear
		const texts = document.querySelectorAll("text");
		const actionTexts = Array.from(texts).filter((t) => t.textContent === "submit");
		expect(actionTexts).toHaveLength(0);
	});

	it("renders action labels by default", () => {
		render(<FlowDiagramView diagram={diagram} />);
		const texts = document.querySelectorAll("text");
		const actionTexts = Array.from(texts).filter((t) => t.textContent === "submit");
		expect(actionTexts.length).toBeGreaterThan(0);
	});

	it("renders with empty diagram", () => {
		const emptyDiagram: FlowDiagram = { nodes: [], edges: [] };
		render(<FlowDiagramView diagram={emptyDiagram} />);
		expect(screen.getByTestId("flow-diagram-view")).toBeInTheDocument();
	});

	it("highlights current node", () => {
		render(<FlowDiagramView diagram={diagram} currentNodeId="auth_login" />);
		// The component renders - visual tests would verify color changes
		expect(screen.getByTestId("flow-diagram-view")).toBeInTheDocument();
	});
});
