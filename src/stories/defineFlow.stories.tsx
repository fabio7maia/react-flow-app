import type { Meta, StoryObj } from "@storybook/react";
import { defineFlow } from "../api/defineFlow";
import { defineScreens } from "../api/defineScreens";
import { extractGraph } from "../diagram/extractGraph";
import { FlowDiagramView } from "../diagram/FlowDiagramView";
import { toMermaid } from "../diagram/mermaid";

// ─── Demo ─────────────────────────────────────────────────────────────────────

function DefineFlowDemo() {
	const screens = defineScreens({
		login: {
			actions: ["submit", "forgotPassword"] as const,
			loader: () => Promise.resolve({ default: () => null }),
		},
		dashboard: {
			actions: ["logout", "settings"] as const,
			loader: () => Promise.resolve({ default: () => null }),
		},
		settings: {
			actions: ["save", "cancel"] as const,
			loader: () => Promise.resolve({ default: () => null }),
		},
		resetPassword: {
			actions: ["submit"] as const,
			loader: () => Promise.resolve({ default: () => null }),
		},
	});

	const authFlow = defineFlow({
		name: "auth",
		baseUrl: "/auth",
		steps: {
			login: { initialStep: true },
			dashboard: { clearHistory: true },
			settings: {},
			resetPassword: {},
		},
		transitions: {
			login: {
				submit: "dashboard",
				forgotPassword: "resetPassword",
			},
			dashboard: {
				logout: "login",
				settings: "settings",
			},
			settings: {
				save: "dashboard",
				cancel: "dashboard",
			},
			resetPassword: {
				submit: "login",
			},
		},
	});

	const diagram = extractGraph({ auth: authFlow }, screens);
	const mermaid = toMermaid(diagram, { groupByFlow: true, includeActions: true });

	return (
		<div style={{ fontFamily: "system-ui, sans-serif", padding: "1rem" }}>
			<h2>defineFlow</h2>
			<p style={{ color: "#666" }}>
				Defines a flow with steps and type-safe transitions. The flow is visualized below.
			</p>

			<h3>Flow Diagram</h3>
			<FlowDiagramView diagram={diagram} showActions />

			<h3>Mermaid Output</h3>
			<pre
				style={{
					background: "#1a1a2e",
					color: "#a8d8a8",
					padding: "1rem",
					borderRadius: "8px",
					overflowX: "auto",
					fontSize: "13px",
				}}
			>
				{mermaid}
			</pre>

			<h3>Flow Config</h3>
			<pre
				style={{
					background: "#f5f5f5",
					padding: "1rem",
					borderRadius: "8px",
					fontSize: "12px",
					overflowX: "auto",
				}}
			>
				{`const authFlow = defineFlow({
  name: 'auth',
  baseUrl: '/auth',
  steps: {
    login: { initialStep: true },
    dashboard: { clearHistory: true },
    settings: {},
    resetPassword: {},
  },
  transitions: {
    login: {
      submit: 'dashboard',       // → goes to dashboard
      forgotPassword: 'resetPassword', // → goes to resetPassword
    },
    dashboard: {
      logout: 'login',           // → goes back to login
      settings: 'settings',     // → goes to settings
    },
    settings: {
      save: 'dashboard',        // → goes to dashboard
      cancel: 'dashboard',      // → goes to dashboard
    },
    resetPassword: {
      submit: 'login',          // → goes to login after reset
    },
  },
});`}
			</pre>
		</div>
	);
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
	title: "Core/defineFlow",
	component: DefineFlowDemo,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component: `
## defineFlow

Factory function for defining a flow with type-safe transitions.

\`\`\`ts
const authFlow = defineFlow({
  name: 'auth',
  steps: {
    login: { initialStep: true },
    dashboard: { clearHistory: true },
  },
  transitions: {
    login: { submit: 'dashboard' },
    dashboard: { logout: 'login' },
  },
});
\`\`\`
				`,
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DefineFlowDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
