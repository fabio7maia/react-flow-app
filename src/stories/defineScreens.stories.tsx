import type { Meta, StoryObj } from "@storybook/react";
import type React from "react";
import { defineScreens } from "../api/defineScreens";

// ─── Demo Component ───────────────────────────────────────────────────────────

function DefineScreensDemo() {
	const screens = defineScreens({
		login: {
			actions: ["submit", "forgotPassword"] as const,
			loader: () => Promise.resolve({ default: () => <div>Login</div> }),
			meta: { requiresAuth: false },
		},
		dashboard: {
			actions: ["logout", "settings", "profile"] as const,
			loader: () => Promise.resolve({ default: () => <div>Dashboard</div> }),
			meta: { requiresAuth: true },
		},
		settings: {
			actions: ["save", "cancel", "deleteAccount"] as const,
			loader: () => Promise.resolve({ default: () => <div>Settings</div> }),
			meta: { requiresAuth: true },
		},
	});

	const cardStyle: React.CSSProperties = {
		background: "#fff",
		borderRadius: "8px",
		padding: "1rem",
		border: "1px solid #e0e0e0",
		marginBottom: "1rem",
	};

	const tagStyle: React.CSSProperties = {
		display: "inline-block",
		padding: "2px 8px",
		borderRadius: "12px",
		fontSize: "12px",
		fontWeight: 600,
		background: "#e3f2fd",
		color: "#1565c0",
		margin: "2px",
	};

	return (
		<div style={{ fontFamily: "system-ui, sans-serif", padding: "1rem" }}>
			<h2>defineScreens Output</h2>
			<p style={{ color: "#666" }}>
				Each screen gets a <code>name</code> and <code>__brand</code> property automatically
				inferred at compile time.
			</p>

			{Object.values(screens).map((screen) => (
				<div key={screen.name as string} style={cardStyle}>
					<h3 style={{ margin: "0 0 0.5rem" }}>
						{screen.name as string}
						<span
							style={{
								marginLeft: "8px",
								fontSize: "12px",
								color: "#4caf50",
								fontWeight: "normal",
							}}
						>
							({screen.__brand})
						</span>
					</h3>
					<div>
						<strong>Actions: </strong>
						{(screen.actions as readonly string[]).map((a) => (
							<span key={a} style={tagStyle}>
								{a}
							</span>
						))}
					</div>
					{screen.meta && (
						<div style={{ marginTop: "0.5rem", color: "#666", fontSize: "13px" }}>
							<strong>Meta: </strong>
							{JSON.stringify(screen.meta)}
						</div>
					)}
				</div>
			))}

			<div
				style={{
					marginTop: "1rem",
					padding: "1rem",
					background: "#f5f5f5",
					borderRadius: "8px",
					fontSize: "13px",
					fontFamily: "monospace",
				}}
			>
				<pre>{`const screens = defineScreens({
  login: {
    actions: ['submit', 'forgotPassword'] as const,
    loader: () => import('./LoginScreen'),
    meta: { requiresAuth: false },
  },
  // ...
});

// TypeScript infers:
// screens.login.name = 'login'
// screens.login.actions = readonly ['submit', 'forgotPassword']
// dispatch('invalid') // TS Error!`}</pre>
			</div>
		</div>
	);
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
	title: "Core/defineScreens",
	component: DefineScreensDemo,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component: `
## defineScreens

Factory function for defining screens with full TypeScript inference.

\`\`\`ts
const screens = defineScreens({
  login: {
    actions: ['submit', 'forgotPassword'] as const,
    loader: () => import('./LoginScreen'),
    meta: { requiresAuth: false },
  },
});

// TypeScript auto-infers:
// screens.login.name = 'login'
// screens.login.__brand = 'Screen'
// screens.login.actions = readonly ['submit', 'forgotPassword']
\`\`\`
				`,
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DefineScreensDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
