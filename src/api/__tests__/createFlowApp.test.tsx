import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFlowApp } from "../createFlowApp";
import { defineFlow } from "../defineFlow";
import { defineScreens } from "../defineScreens";

// ─── Test Components ─────────────────────────────────────────────────────────

function LoginScreen() {
	return <div data-testid="login-screen">Login</div>;
}
function DashboardScreen() {
	return <div data-testid="dashboard-screen">Dashboard</div>;
}
function SettingsScreen() {
	return <div data-testid="settings-screen">Settings</div>;
}

// ─── Test Fixtures ────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("createFlowApp", () => {
	let app: ReturnType<typeof createFlowApp<typeof screens, { auth: typeof authFlow }>>;

	beforeEach(() => {
		app = createFlowApp({
			screens,
			flows: { auth: authFlow },
		});
	});

	describe("FlowProvider", () => {
		it("renders children", () => {
			const { FlowProvider } = app;
			render(
				<FlowProvider>
					<div data-testid="child">Hello</div>
				</FlowProvider>
			);
			expect(screen.getByTestId("child")).toBeInTheDocument();
		});

		it("starts initial flow on mount", async () => {
			const { FlowProvider, useFlowState } = app;

			function TestComponent() {
				const state = useFlowState();
				return <div data-testid="flow">{state.activeFlowName ?? "none"}</div>;
			}

			render(
				<FlowProvider initialFlow="auth">
					<TestComponent />
				</FlowProvider>
			);

			await waitFor(() => {
				expect(screen.getByTestId("flow")).toHaveTextContent("auth");
			});
		});

		it("throws error when hooks are used outside provider", () => {
			const { useFlowState } = app;
			// Suppress React error boundary output
			const error = vi.spyOn(console, "error").mockImplementation(() => {});

			function BadComponent() {
				useFlowState();
				return null;
			}

			expect(() => render(<BadComponent />)).toThrow(
				"[react-flow-app] Hook must be used inside <FlowProvider>"
			);
			error.mockRestore();
		});
	});

	describe("useFlowState", () => {
		it("returns current flow state", async () => {
			const { FlowProvider, useFlowState } = app;

			function TestComponent() {
				const state = useFlowState();
				return (
					<div>
						<span data-testid="flow">{state.activeFlowName ?? "none"}</span>
						<span data-testid="step">{state.activeStepName ?? "none"}</span>
					</div>
				);
			}

			render(
				<FlowProvider initialFlow="auth">
					<TestComponent />
				</FlowProvider>
			);

			await waitFor(() => {
				expect(screen.getByTestId("flow")).toHaveTextContent("auth");
				expect(screen.getByTestId("step")).toHaveTextContent("login");
			});
		});
	});

	describe("useFlowManager", () => {
		it("exposes start, currentFlowName, currentStepName, clearHistory", async () => {
			const { FlowProvider, useFlowManager } = app;
			let manager: ReturnType<typeof useFlowManager> | null = null;

			function TestComponent() {
				manager = useFlowManager();
				return <div data-testid="flow">{manager.currentFlowName ?? "none"}</div>;
			}

			render(
				<FlowProvider>
					<TestComponent />
				</FlowProvider>
			);

			expect(manager).not.toBeNull();
			expect(manager?.currentFlowName).toBeNull();

			act(() => {
				manager?.start({ flowName: "auth" });
			});

			await waitFor(() => {
				expect(screen.getByTestId("flow")).toHaveTextContent("auth");
			});
		});

		it("clearHistory resets history", async () => {
			const { FlowProvider, useFlowManager, useFlowHistory } = app;

			function TestComponent() {
				const manager = useFlowManager();
				const history = useFlowHistory();
				return (
					<div>
						<div data-testid="history-count">{history.length}</div>
						<button onClick={() => manager.start({ flowName: "auth" })}>Start</button>
						<button onClick={() => manager.clearHistory()}>Clear</button>
					</div>
				);
			}

			render(
				<FlowProvider>
					<TestComponent />
				</FlowProvider>
			);

			await userEvent.click(screen.getByText("Start"));
			await waitFor(() => expect(screen.getByTestId("history-count")).toHaveTextContent("1"));

			await userEvent.click(screen.getByText("Clear"));
			// clearHistory keeps current step, removes path history
			await waitFor(() => expect(screen.getByTestId("history-count")).toHaveTextContent("1"));
		});
	});

	describe("useFlow", () => {
		it("provides dispatch and back functions", async () => {
			const { FlowProvider, useFlow, useFlowState } = app;

			function TestComponent() {
				const state = useFlowState();
				const flow = useFlow(screens.login);
				return (
					<div>
						<span data-testid="step">{state.activeStepName ?? "none"}</span>
						<button onClick={() => flow.dispatch("submit")}>Submit</button>
						<button onClick={() => flow.back()}>Back</button>
					</div>
				);
			}

			render(
				<FlowProvider initialFlow="auth">
					<TestComponent />
				</FlowProvider>
			);

			await waitFor(() => expect(screen.getByTestId("step")).toHaveTextContent("login"));

			await userEvent.click(screen.getByText("Submit"));

			await waitFor(() => expect(screen.getByTestId("step")).toHaveTextContent("dashboard"));
		});

		it("dispatch does nothing for unknown action (warns)", async () => {
			const { FlowProvider, useFlow } = app;
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

			function TestComponent() {
				const flow = useFlow(screens.login);
				return <button onClick={() => flow.dispatch("unknown" as never)}>Dispatch</button>;
			}

			render(
				<FlowProvider initialFlow="auth">
					<TestComponent />
				</FlowProvider>
			);

			await waitFor(() => {}); // wait for start

			await userEvent.click(screen.getByText("Dispatch"));
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});
	});

	describe("useFlowHistory", () => {
		it("tracks navigation history", async () => {
			const { FlowProvider, useFlowHistory, useFlow } = app;

			function TestComponent() {
				const history = useFlowHistory();
				const flow = useFlow(screens.login);
				return (
					<div>
						<div data-testid="history">{history.map((h) => h.stepName).join(",")}</div>
						<button onClick={() => flow.dispatch("forgotPassword")}>Go Settings</button>
					</div>
				);
			}

			render(
				<FlowProvider initialFlow="auth">
					<TestComponent />
				</FlowProvider>
			);

			await waitFor(() => expect(screen.getByTestId("history")).toHaveTextContent("login"));

			await userEvent.click(screen.getByText("Go Settings"));

			await waitFor(() =>
				expect(screen.getByTestId("history")).toHaveTextContent("login,settings")
			);
		});
	});

	describe("useFlowListener", () => {
		it("calls listener on events", async () => {
			const { FlowProvider, useFlowListener, useFlowManager } = app;
			const listener = vi.fn();

			function TestComponent() {
				useFlowListener("mount", listener);
				const manager = useFlowManager();
				return <button onClick={() => manager.start({ flowName: "auth" })}>Start</button>;
			}

			render(
				<FlowProvider>
					<TestComponent />
				</FlowProvider>
			);

			await userEvent.click(screen.getByText("Start"));

			await waitFor(() => {
				expect(listener).toHaveBeenCalledWith(
					expect.objectContaining({ type: "mount", flowName: "auth" })
				);
			});
		});
	});

	describe("useFlowDiagram", () => {
		it("returns diagram with nodes and edges", async () => {
			const { FlowProvider, useFlowDiagram } = app;
			let diagram: ReturnType<typeof useFlowDiagram> | null = null;

			function TestComponent() {
				diagram = useFlowDiagram();
				return <div data-testid="nodes">{diagram.nodes.length}</div>;
			}

			render(
				<FlowProvider>
					<TestComponent />
				</FlowProvider>
			);

			expect(diagram).not.toBeNull();
			expect(diagram?.nodes.length).toBe(3);
		});
	});

	describe("getDiagram", () => {
		it("returns diagram without requiring a hook", () => {
			const { getDiagram } = app;
			const diagram = getDiagram();
			expect(diagram.nodes).toHaveLength(3);
			expect(diagram.edges.length).toBeGreaterThan(0);
		});
	});

	describe("a11y announcer", () => {
		it("renders announcer when a11y.announceStepChange is true", async () => {
			const a11yApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { a11y: { announceStepChange: true } },
			});
			const { FlowProvider } = a11yApp;

			render(
				<FlowProvider initialFlow="auth">
					<div />
				</FlowProvider>
			);

			await waitFor(() => {
				const announcer = document.querySelector('[role="status"]');
				expect(announcer).toBeInTheDocument();
			});
		});
	});
});
