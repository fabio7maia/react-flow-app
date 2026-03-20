import { describe, expect, it } from "vitest";
import type { FlowDefinition, ScreenConfig } from "../../types/core";
import { extractGraph } from "../extractGraph";

const mockLoader = () => Promise.resolve({ default: () => null as any });

describe("extractGraph", () => {
	const screens: Record<string, ScreenConfig> = {
		login: { actions: ["submit", "forgotPassword"] as const, loader: mockLoader },
		dashboard: { actions: ["logout", "settings"] as const, loader: mockLoader },
		settings: { actions: ["save", "cancel"] as const, loader: mockLoader },
	};

	const flows: Record<string, FlowDefinition> = {
		auth: {
			name: "auth",
			steps: {
				login: { initialStep: true },
				dashboard: { clearHistory: true },
				settings: {},
			},
			transitions: {
				login: { submit: "dashboard", forgotPassword: "settings" },
				dashboard: { logout: "login", settings: "settings" },
			},
			__brand: "Flow",
		},
	};

	it("creates nodes for each step", () => {
		const diagram = extractGraph(flows, screens);
		expect(diagram.nodes).toHaveLength(3);
		expect(diagram.nodes.map((n) => n.stepName)).toEqual(
			expect.arrayContaining(["login", "dashboard", "settings"])
		);
	});

	it("marks initial steps correctly", () => {
		const diagram = extractGraph(flows, screens);
		const loginNode = diagram.nodes.find((n) => n.stepName === "login");
		const dashboardNode = diagram.nodes.find((n) => n.stepName === "dashboard");
		expect(loginNode?.isInitial).toBe(true);
		expect(dashboardNode?.isInitial).toBe(false);
	});

	it("generates correct node IDs (flowName_stepName)", () => {
		const diagram = extractGraph(flows, screens);
		const ids = diagram.nodes.map((n) => n.id);
		expect(ids).toContain("auth_login");
		expect(ids).toContain("auth_dashboard");
		expect(ids).toContain("auth_settings");
	});

	it("creates edges from string transitions", () => {
		const diagram = extractGraph(flows, screens);
		const loginToLogin = diagram.edges.find(
			(e) => e.from === "auth_login" && e.to === "auth_dashboard"
		);
		expect(loginToLogin).toBeDefined();
		expect(loginToLogin?.action).toBe("submit");
		expect(loginToLogin?.isCrossFlow).toBe(false);
	});

	it("creates cross-flow edges from function transitions", () => {
		const multiFlowScreens: Record<string, ScreenConfig> = {
			home: { actions: ["goAuth"] as const, loader: mockLoader },
			login: { actions: ["submit"] as const, loader: mockLoader },
		};
		const multiFlows: Record<string, FlowDefinition> = {
			main: {
				name: "main",
				steps: { home: { initialStep: true } },
				transitions: {
					home: { goAuth: () => ({ flowName: "auth", stepName: "login" }) },
				},
				__brand: "Flow",
			},
			auth: {
				name: "auth",
				steps: { login: { initialStep: true } },
				transitions: {},
				__brand: "Flow",
			},
		};

		const diagram = extractGraph(multiFlows, multiFlowScreens);
		const crossEdge = diagram.edges.find((e) => e.isCrossFlow);
		expect(crossEdge).toBeDefined();
		expect(crossEdge?.from).toBe("main_home");
		expect(crossEdge?.to).toBe("auth_login");
	});

	it("handles function transitions that throw", () => {
		const badFlows: Record<string, FlowDefinition> = {
			test: {
				name: "test",
				steps: { step1: { initialStep: true } },
				transitions: {
					step1: {
						action: () => {
							throw new Error("oops");
						},
					},
				},
				__brand: "Flow",
			},
		};
		// Should not throw
		expect(() => extractGraph(badFlows, {})).not.toThrow();
	});

	it("includes screen actions in nodes", () => {
		const diagram = extractGraph(flows, screens);
		const loginNode = diagram.nodes.find((n) => n.stepName === "login");
		expect(loginNode?.actions).toContain("submit");
		expect(loginNode?.actions).toContain("forgotPassword");
	});

	it("handles steps with no matching screen (empty actions)", () => {
		const noScreenFlows: Record<string, FlowDefinition> = {
			test: {
				name: "test",
				steps: { unknownScreen: { initialStep: true } },
				transitions: {},
				__brand: "Flow",
			},
		};
		const diagram = extractGraph(noScreenFlows, {});
		expect(diagram.nodes[0]?.actions).toEqual([]);
	});

	it("marks first step as initial when no initialStep explicitly set", () => {
		const implicitFlow: Record<string, FlowDefinition> = {
			test: {
				name: "test",
				steps: { first: {}, second: {} },
				transitions: {},
				__brand: "Flow",
			},
		};
		const diagram = extractGraph(implicitFlow, {});
		const firstNode = diagram.nodes.find((n) => n.stepName === "first");
		expect(firstNode?.isInitial).toBe(true);
	});

	it("handles empty flows", () => {
		const diagram = extractGraph({}, {});
		expect(diagram.nodes).toHaveLength(0);
		expect(diagram.edges).toHaveLength(0);
	});
});
