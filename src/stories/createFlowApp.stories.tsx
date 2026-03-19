import type { Meta, StoryObj } from "@storybook/react";
import type React from "react";
import { useState } from "react";
import { createFlowApp } from "../api/createFlowApp";
import { defineFlow } from "../api/defineFlow";
import { defineScreens } from "../api/defineScreens";
import { FlowDiagramView } from "../diagram/FlowDiagramView";

// ─── Screen Components ────────────────────────────────────────────────────────

function LoginScreen() {
	return (
		<div
			style={{
				padding: "2rem",
				background: "#fff",
				borderRadius: "12px",
				boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
				maxWidth: "400px",
				margin: "0 auto",
			}}
		>
			<h2 style={{ margin: "0 0 1rem", color: "#333" }}>Login</h2>
			<p style={{ color: "#666" }}>Enter your credentials to continue.</p>
		</div>
	);
}

function DashboardScreen() {
	return (
		<div
			style={{
				padding: "2rem",
				background: "#e8f5e9",
				borderRadius: "12px",
				boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
				maxWidth: "400px",
				margin: "0 auto",
			}}
		>
			<h2 style={{ margin: "0 0 1rem", color: "#2e7d32" }}>Dashboard</h2>
			<p style={{ color: "#555" }}>Welcome! You are now logged in.</p>
		</div>
	);
}

function SettingsScreen() {
	return (
		<div
			style={{
				padding: "2rem",
				background: "#e3f2fd",
				borderRadius: "12px",
				boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
				maxWidth: "400px",
				margin: "0 auto",
			}}
		>
			<h2 style={{ margin: "0 0 1rem", color: "#1565c0" }}>Settings</h2>
			<p style={{ color: "#555" }}>Configure your preferences here.</p>
		</div>
	);
}

// ─── App Setup ────────────────────────────────────────────────────────────────

const screens = defineScreens({
	login: {
		actions: ["submit", "forgotPassword"] as const,
		loader: () => Promise.resolve({ default: LoginScreen }),
	},
	dashboard: {
		actions: ["logout", "settings"] as const,
		loader: () => Promise.resolve({ default: DashboardScreen }),
	},
	settings: {
		actions: ["save", "cancel"] as const,
		loader: () => Promise.resolve({ default: SettingsScreen }),
	},
});

const authFlow = defineFlow({
	name: "auth",
	baseUrl: "/auth",
	steps: {
		login: { initialStep: true },
		dashboard: { clearHistory: true },
		settings: {},
	},
	transitions: {
		login: { submit: "dashboard", forgotPassword: "settings" },
		dashboard: { logout: "login", settings: "settings" },
		settings: { save: "dashboard", cancel: "dashboard" },
	},
});

const { FlowProvider, useFlow, useFlowManager, useFlowDiagram } = createFlowApp({
	screens,
	flows: { auth: authFlow },
	options: {
		a11y: { announceStepChange: true },
	},
});

// ─── Demo Component ───────────────────────────────────────────────────────────

// All possible actions in the demo for the control panel
type DemoAction = "submit" | "forgotPassword" | "logout" | "settings" | "save" | "cancel";

function FlowDemo() {
	const manager = useFlowManager();
	// Use a generic approach for the demo - we pass the store dispatch directly
	const { store } = createFlowApp({ screens, flows: { auth: authFlow } });
	const diagram = useFlowDiagram();
	const [, setCurrentNodeId] = useState<string | undefined>();

	const currentId =
		manager.currentFlowName && manager.currentStepName
			? `${manager.currentFlowName}_${manager.currentStepName}`
			: undefined;

	const dispatch = (action: DemoAction) => store.dispatch(action);

	const containerStyle: React.CSSProperties = {
		fontFamily: "system-ui, sans-serif",
		display: "flex",
		flexDirection: "column",
		gap: "1.5rem",
		padding: "1.5rem",
		background: "#f8f9fa",
		borderRadius: "16px",
	};

	const buttonGroupStyle: React.CSSProperties = {
		display: "flex",
		gap: "0.5rem",
		flexWrap: "wrap",
	};

	const buttonStyle = (color: string): React.CSSProperties => ({
		padding: "0.5rem 1rem",
		background: color,
		color: "white",
		border: "none",
		borderRadius: "6px",
		cursor: "pointer",
		fontWeight: 600,
		fontSize: "14px",
	});

	return (
		<div style={containerStyle}>
			<h2 style={{ margin: 0 }}>react-flow-app v2 Demo</h2>

			{/* Status */}
			<div
				style={{
					background: "#fff",
					padding: "1rem",
					borderRadius: "8px",
					border: "1px solid #e0e0e0",
				}}
			>
				<strong>Current state:</strong>{" "}
				{manager.currentFlowName
					? `${manager.currentFlowName} → ${manager.currentStepName}`
					: "No flow active"}
			</div>

			{/* Controls */}
			<div style={buttonGroupStyle}>
				<button style={buttonStyle("#4caf50")} onClick={() => manager.start({ flowName: "auth" })}>
					Start Auth Flow
				</button>
				<button
					style={buttonStyle("#2196f3")}
					onClick={() => dispatch("submit")}
					disabled={!manager.currentFlowName}
				>
					submit
				</button>
				<button
					style={buttonStyle("#9c27b0")}
					onClick={() => dispatch("forgotPassword")}
					disabled={!manager.currentFlowName}
				>
					forgotPassword
				</button>
				<button
					style={buttonStyle("#f44336")}
					onClick={() => dispatch("logout")}
					disabled={!manager.currentFlowName}
				>
					logout
				</button>
				<button
					style={buttonStyle("#ff9800")}
					onClick={() => dispatch("settings")}
					disabled={!manager.currentFlowName}
				>
					settings
				</button>
				<button
					style={buttonStyle("#607d8b")}
					onClick={() => store.back()}
					disabled={!manager.currentFlowName}
				>
					← Back
				</button>
				<button
					style={buttonStyle("#795548")}
					onClick={() => manager.clearHistory()}
					disabled={!manager.currentFlowName}
				>
					Clear History
				</button>
			</div>

			{/* Diagram */}
			<FlowDiagramView
				diagram={diagram}
				currentNodeId={currentId}
				showActions
				onNodeClick={(node) => setCurrentNodeId(node.id)}
				style={{ minHeight: "200px" }}
			/>
		</div>
	);
}

// ─── Wrapper with Provider ────────────────────────────────────────────────────

function DemoWithProvider() {
	return (
		<FlowProvider>
			<FlowDemo />
		</FlowProvider>
	);
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
	title: "Core/createFlowApp",
	component: DemoWithProvider,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component: `
## createFlowApp

The main factory function that creates a typed \`FlowProvider\` and hooks.

\`\`\`ts
const { FlowProvider, useFlow, useFlowManager } = createFlowApp({
  screens,
  flows: { auth: authFlow },
  options: { a11y: { announceStepChange: true } },
});
\`\`\`

### Usage
1. Click **Start Auth Flow** to begin
2. Use action buttons to navigate between steps
3. Click nodes in the diagram to see the current state highlighted
				`,
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DemoWithProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
