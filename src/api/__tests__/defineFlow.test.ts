import { describe, expect, it } from "vitest";
import { defineFlow } from "../defineFlow";

describe("defineFlow", () => {
	it("returns a flow definition with __brand", () => {
		const flow = defineFlow({
			name: "auth",
			steps: { login: { initialStep: true } },
			transitions: {},
		});

		expect(flow.__brand).toBe("Flow");
		expect(flow.name).toBe("auth");
	});

	it("preserves all config properties", () => {
		const flow = defineFlow({
			name: "auth",
			baseUrl: "/auth",
			steps: {
				login: { initialStep: true },
				dashboard: { clearHistory: true },
			},
			transitions: {
				login: { submit: "dashboard" },
				dashboard: { logout: "login" },
			},
		});

		expect(flow.baseUrl).toBe("/auth");
		expect(flow.steps.login?.initialStep).toBe(true);
		expect(flow.steps.dashboard?.clearHistory).toBe(true);
		expect(flow.transitions.login?.submit).toBe("dashboard");
	});

	it("supports function transitions", () => {
		const navFn = () => ({ flowName: "main", stepName: "home" });
		const flow = defineFlow({
			name: "auth",
			steps: { login: {} },
			transitions: {
				login: { goToMain: navFn },
			},
		});

		expect(typeof flow.transitions.login?.goToMain).toBe("function");
	});

	it("can have empty steps and transitions", () => {
		const flow = defineFlow({
			name: "empty",
			steps: {},
			transitions: {},
		});

		expect(flow.steps).toEqual({});
		expect(flow.transitions).toEqual({});
	});
});
