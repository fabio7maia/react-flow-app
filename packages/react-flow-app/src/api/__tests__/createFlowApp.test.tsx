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

		it("renders main landmark with flow label", async () => {
			const { FlowProvider } = app;
			render(<FlowProvider initialFlow="auth" />);

			await waitFor(() => {
				const main = document.querySelector("main");
				expect(main).toBeInTheDocument();
				expect(main).toHaveAttribute("aria-label", "auth flow");
			});
		});

		it("renders main landmark with default label when no flow active", () => {
			const { FlowProvider } = app;
			render(<FlowProvider />);
			const main = document.querySelector("main");
			expect(main).toBeInTheDocument();
			expect(main).toHaveAttribute("aria-label", "Application flow");
		});

		it("renders custom errorFallback in ErrorBoundary when error occurs", () => {
			const { FlowProvider } = app;
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			function BombComponent(): never {
				throw new Error("Boom!");
			}

			render(
				<FlowProvider errorFallback={<div data-testid="custom-error">Custom Error</div>}>
					<BombComponent />
				</FlowProvider>
			);

			expect(screen.getByTestId("custom-error")).toBeInTheDocument();
			errorSpy.mockRestore();
		});

		it("renders default error UI when no errorFallback provided", () => {
			const { FlowProvider } = app;
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			function BombComponent(): never {
				throw new Error("Kaboom!");
			}

			render(
				<FlowProvider>
					<BombComponent />
				</FlowProvider>
			);

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText(/Kaboom!/)).toBeInTheDocument();
			errorSpy.mockRestore();
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
						<button type="button" onClick={() => manager.start({ flowName: "auth" })}>
							Start
						</button>
						<button type="button" onClick={() => manager.clearHistory()}>
							Clear
						</button>
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
						<button type="button" onClick={() => flow.dispatch("submit")}>
							Submit
						</button>
						<button type="button" onClick={() => flow.back()}>
							Back
						</button>
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
				return (
					<button type="button" onClick={() => flow.dispatch("unknown" as never)}>
						Dispatch
					</button>
				);
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
						<button type="button" onClick={() => flow.dispatch("forgotPassword")}>
							Go Settings
						</button>
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
				return (
					<button type="button" onClick={() => manager.start({ flowName: "auth" })}>
						Start
					</button>
				);
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

		it("does not render announcer when announceStepChange is false", () => {
			const { FlowProvider } = app; // no a11y options
			render(<FlowProvider initialFlow="auth" />);
			// No status role from announcer (there may be a loading status, so check aria-live)
			const liveRegion = document.querySelector('[aria-live="polite"][aria-atomic="true"]');
			expect(liveRegion).toBeNull();
		});

		it("uses assertive politeness when liveRegionPoliteness is assertive", async () => {
			const assertiveApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: {
					a11y: { announceStepChange: true, liveRegionPoliteness: "assertive" },
				},
			});
			const { FlowProvider } = assertiveApp;

			render(<FlowProvider initialFlow="auth" />);

			await waitFor(() => {
				const announcer = document.querySelector('[aria-live="assertive"][aria-atomic="true"]');
				expect(announcer).toBeInTheDocument();
			});
		});

		it("announces step name after navigation", async () => {
			const a11yApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { a11y: { announceStepChange: true } },
			});
			const { FlowProvider, useFlow } = a11yApp;

			function TestComp() {
				const flow = useFlow(screens.login);
				return (
					<button type="button" onClick={() => flow.dispatch("submit")}>
						Submit
					</button>
				);
			}

			render(
				<FlowProvider initialFlow="auth">
					<TestComp />
				</FlowProvider>
			);

			await waitFor(() => {
				const announcer = document.querySelector('[role="status"]');
				expect(announcer?.textContent).toContain("login");
			});

			await userEvent.click(screen.getByText("Submit"));

			await waitFor(() => {
				const announcer = document.querySelector('[role="status"]');
				expect(announcer?.textContent).toContain("dashboard");
			});
		});
	});

	describe("animation", () => {
		it("does not inject transition CSS when animation is false", () => {
			const noAnimApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { animation: false },
			});
			const { FlowProvider } = noAnimApp;
			render(<FlowProvider initialFlow="auth" />);
			// No <style> tag with rfa CSS should be present
			const styles = Array.from(document.querySelectorAll("style"));
			const rfaStyle = styles.find((s) => s.textContent?.includes("rfa-step-wrapper"));
			expect(rfaStyle).toBeUndefined();
		});

		it("injects transition CSS when animation is true", () => {
			const animApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { animation: true },
			});
			const { FlowProvider } = animApp;
			render(<FlowProvider initialFlow="auth" />);
			const styles = Array.from(document.querySelectorAll("style"));
			const rfaStyle = styles.find((s) => s.textContent?.includes("rfa-step-wrapper"));
			expect(rfaStyle).toBeDefined();
		});

		it("injects CSS when animation is 'slide'", () => {
			const slideApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { animation: "slide" },
			});
			const { FlowProvider } = slideApp;
			render(<FlowProvider initialFlow="auth" />);
			const styles = Array.from(document.querySelectorAll("style"));
			const rfaStyle = styles.find((s) => s.textContent?.includes("rfa-slide-forward"));
			expect(rfaStyle).toBeDefined();
		});

		it("injects CSS when animation is 'fade'", () => {
			const fadeApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { animation: "fade" },
			});
			const { FlowProvider } = fadeApp;
			render(<FlowProvider initialFlow="auth" />);
			const styles = Array.from(document.querySelectorAll("style"));
			const rfaStyle = styles.find((s) => s.textContent?.includes("rfa-fade"));
			expect(rfaStyle).toBeDefined();
		});

		it("injects CSS for prefers-reduced-motion", () => {
			const animApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { animation: "fade" },
			});
			const { FlowProvider } = animApp;
			render(<FlowProvider initialFlow="auth" />);
			const styles = Array.from(document.querySelectorAll("style"));
			const rfaStyle = styles.find((s) => s.textContent?.includes("prefers-reduced-motion"));
			expect(rfaStyle).toBeDefined();
		});
	});

	describe("focus management", () => {
		it("active step slot has tabIndex=-1 for programmatic focus", async () => {
			const focusApp = createFlowApp({
				screens,
				flows: { auth: authFlow },
				options: { a11y: { manageFocus: true }, animation: "none" },
			});
			const { FlowProvider } = focusApp;
			render(<FlowProvider initialFlow="auth" />);

			await waitFor(() => {
				const slot = document.querySelector(".rfa-step-slot");
				expect(slot).toBeInTheDocument();
				expect(slot).toHaveAttribute("tabindex", "-1");
			});
		});
	});
});
