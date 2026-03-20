import type { Meta, StoryObj } from "@storybook/react";
import type React from "react";
import { useState } from "react";
import { createFlowApp } from "../api/createFlowApp";
import { defineFlow } from "../api/defineFlow";
import { defineScreens } from "../api/defineScreens";
import { FlowDiagramView } from "../diagram/FlowDiagramView";
import type { AnimationType } from "../types/core";

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

// ─── Demo Component Factory ───────────────────────────────────────────────────

type DemoAction = "submit" | "forgotPassword" | "logout" | "settings" | "save" | "cancel";

function createDemo(animation: boolean | AnimationType, a11y = false) {
	const demoApp = createFlowApp({
		screens,
		flows: { auth: authFlow },
		options: {
			animation,
			animationDuration: 300,
			a11y: {
				announceStepChange: a11y,
				manageFocus: a11y,
			},
		},
	});

	const { FlowProvider, useFlowManager, useFlowDiagram } = demoApp;

	function FlowDemo() {
		const manager = useFlowManager();
		const diagram = useFlowDiagram();
		const [, setCurrentNodeId] = useState<string | undefined>();

		const currentId =
			manager.currentFlowName && manager.currentStepName
				? `${manager.currentFlowName}_${manager.currentStepName}`
				: undefined;

		const dispatch = (action: DemoAction) => demoApp.store.dispatch(action);

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
				<h2 style={{ margin: 0 }}>
					react-flow-app — animation: <code>{String(animation)}</code>
					{a11y && " + a11y"}
				</h2>

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

				<div style={buttonGroupStyle}>
					<button
						type="button"
						style={buttonStyle("#4caf50")}
						onClick={() => manager.start({ flowName: "auth" })}
					>
						Start Auth Flow
					</button>
					<button
						type="button"
						style={buttonStyle("#2196f3")}
						onClick={() => dispatch("submit")}
						disabled={!manager.currentFlowName}
					>
						submit
					</button>
					<button
						type="button"
						style={buttonStyle("#9c27b0")}
						onClick={() => dispatch("forgotPassword")}
						disabled={!manager.currentFlowName}
					>
						forgotPassword
					</button>
					<button
						type="button"
						style={buttonStyle("#f44336")}
						onClick={() => dispatch("logout")}
						disabled={!manager.currentFlowName}
					>
						logout
					</button>
					<button
						type="button"
						style={buttonStyle("#ff9800")}
						onClick={() => dispatch("settings")}
						disabled={!manager.currentFlowName}
					>
						settings
					</button>
					<button
						type="button"
						style={buttonStyle("#607d8b")}
						onClick={() => demoApp.store.back()}
						disabled={!manager.currentFlowName}
					>
						← Back
					</button>
					<button
						type="button"
						style={buttonStyle("#795548")}
						onClick={() => manager.clearHistory()}
						disabled={!manager.currentFlowName}
					>
						Clear History
					</button>
				</div>

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

	function DemoWithProvider() {
		return (
			<FlowProvider>
				<FlowDemo />
			</FlowProvider>
		);
	}

	DemoWithProvider.displayName = `Demo_${String(animation)}`;

	return DemoWithProvider;
}

// ─── Story Components ─────────────────────────────────────────────────────────

const FadeDemo = createDemo("fade");
const SlideDemo = createDemo("slide");
const NoAnimDemo = createDemo(false);
const A11yDemo = createDemo("fade", true);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
	title: "Core/createFlowApp",
	component: FadeDemo,
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
  options: {
    animation: 'fade',           // 'fade' | 'slide' | 'none' | true | false
    animationDuration: 300,      // ms
    a11y: {
      announceStepChange: true,  // aria-live region for screen readers
      manageFocus: true,         // move focus to step content on navigation
      liveRegionPoliteness: 'polite', // 'polite' | 'assertive'
    },
  },
});
\`\`\`

### Usage
1. Click **Start Auth Flow** to begin
2. Use action buttons to navigate between steps
3. The diagram highlights the current node
				`,
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof FadeDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fade cross-dissolve transition between steps (default when animation: true) */
export const FadeTransition: Story = {
	render: () => <FadeDemo />,
	name: "Fade transition",
};

/** Horizontal slide transition — slides forward on dispatch, back on back() */
export const SlideTransition: Story = {
	render: () => <SlideDemo />,
	name: "Slide transition",
};

/** No animation — instant step swap */
export const NoAnimation: Story = {
	render: () => <NoAnimDemo />,
	name: "No animation",
};

/**
 * Full accessibility demo:
 * - `aria-live` region announces step changes to screen readers
 * - Focus moves to the step content area on each navigation
 * - `<main>` landmark wraps the flow for easy navigation
 */
export const WithAccessibility: Story = {
	render: () => <A11yDemo />,
	name: "With accessibility (a11y)",
};
