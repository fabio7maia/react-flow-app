import type { Meta, StoryObj } from "@storybook/react";
import { FlowDiagramView } from "../diagram/FlowDiagramView";
import type { FlowDiagram } from "../types/core";

// ─── Sample diagram data ─────────────────────────────────────────────────────

const authDiagram: FlowDiagram = {
	nodes: [
		{
			id: "auth_login",
			flowName: "auth",
			stepName: "login",
			actions: ["submit", "forgotPassword"],
			options: { initialStep: true },
			isInitial: true,
		},
		{
			id: "auth_register",
			flowName: "auth",
			stepName: "register",
			actions: ["submit", "back"],
			options: {},
			isInitial: false,
		},
		{
			id: "auth_dashboard",
			flowName: "auth",
			stepName: "dashboard",
			actions: ["logout", "settings"],
			options: { clearHistory: true },
			isInitial: false,
		},
		{
			id: "auth_settings",
			flowName: "auth",
			stepName: "settings",
			actions: ["save", "cancel"],
			options: {},
			isInitial: false,
		},
	],
	edges: [
		{ from: "auth_login", to: "auth_dashboard", action: "submit", isCrossFlow: false },
		{ from: "auth_login", to: "auth_register", action: "forgotPassword", isCrossFlow: false },
		{ from: "auth_register", to: "auth_dashboard", action: "submit", isCrossFlow: false },
		{ from: "auth_dashboard", to: "auth_login", action: "logout", isCrossFlow: false },
		{ from: "auth_dashboard", to: "auth_settings", action: "settings", isCrossFlow: false },
		{ from: "auth_settings", to: "auth_dashboard", action: "save", isCrossFlow: false },
	],
};

const multiFlowDiagram: FlowDiagram = {
	nodes: [
		...authDiagram.nodes,
		{
			id: "main_home",
			flowName: "main",
			stepName: "home",
			actions: ["goAuth"],
			options: { initialStep: true },
			isInitial: true,
		},
		{
			id: "main_profile",
			flowName: "main",
			stepName: "profile",
			actions: ["edit", "back"],
			options: {},
			isInitial: false,
		},
	],
	edges: [
		...authDiagram.edges,
		{
			from: "main_home",
			to: "auth_login",
			action: "goAuth",
			isCrossFlow: true,
		},
		{
			from: "auth_dashboard",
			to: "main_home",
			action: "goHome",
			isCrossFlow: true,
		},
	],
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
	title: "Diagram/FlowDiagramView",
	component: FlowDiagramView,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Interactive SVG diagram that visualizes flow navigation graphs. Shows nodes (steps) and edges (transitions) with action labels.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		theme: {
			control: { type: "select" },
			options: ["default", "dark", "minimal"],
			description: "Visual theme for the diagram",
		},
		showActions: {
			control: { type: "boolean" },
			description: "Show action labels on edges",
		},
		currentNodeId: {
			control: { type: "text" },
			description: "ID of the currently active node",
		},
		onNodeClick: {
			action: "nodeClicked",
			description: "Called when a node is clicked",
		},
	},
} satisfies Meta<typeof FlowDiagramView>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
	args: {
		diagram: authDiagram,
		showActions: true,
		theme: "default",
	},
};

export const WithCurrentNode: Story = {
	args: {
		diagram: authDiagram,
		currentNodeId: "auth_dashboard",
		showActions: true,
		theme: "default",
	},
	parameters: {
		docs: {
			description: {
				story: "With `currentNodeId` set to highlight the active step (dashboard in red).",
			},
		},
	},
};

export const DarkTheme: Story = {
	args: {
		diagram: authDiagram,
		theme: "dark",
		showActions: true,
		currentNodeId: "auth_login",
	},
	parameters: {
		backgrounds: { default: "dark" },
	},
};

export const MinimalTheme: Story = {
	args: {
		diagram: authDiagram,
		theme: "minimal",
		showActions: false,
	},
};

export const MultiFlowDiagram: Story = {
	args: {
		diagram: multiFlowDiagram,
		showActions: true,
		theme: "default",
	},
	parameters: {
		docs: {
			description: {
				story:
					"Multi-flow diagram showing cross-flow edges (dashed lines) between auth and main flows.",
			},
		},
	},
};

export const Interactive: Story = {
	args: {
		diagram: authDiagram,
		showActions: true,
		theme: "default",
		onNodeClick: undefined, // will be set by argTypes action
	},
	render: (args) => {
		return (
			<div>
				<p style={{ fontFamily: "sans-serif", color: "#666", marginBottom: "8px" }}>
					Click a node to see its details in the Actions panel below.
				</p>
				<FlowDiagramView {...args} />
			</div>
		);
	},
};

export const EmptyDiagram: Story = {
	args: {
		diagram: { nodes: [], edges: [] },
		showActions: true,
		theme: "default",
	},
};
