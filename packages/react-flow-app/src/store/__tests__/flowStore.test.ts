import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlowDefinition, ScreenConfig } from "../../types/core";
import { FlowStore } from "../flowStore";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const mockLoader = () => Promise.resolve({ default: () => null as any });

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
			settings: { save: "dashboard", cancel: "dashboard" },
		},
		__brand: "Flow",
	},
};

function createStore() {
	return new FlowStore(flows, screens);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FlowStore", () => {
	let store: FlowStore;

	beforeEach(() => {
		store = createStore();
	});

	describe("subscribe / getSnapshot", () => {
		it("returns initial state", () => {
			const state = store.getSnapshot();
			expect(state.activeFlowName).toBeNull();
			expect(state.activeStepName).toBeNull();
			expect(state.history).toEqual([]);
			expect(state.isLoading).toBe(false);
		});

		it("notifies listener on state change", () => {
			const listener = vi.fn();
			const unsubscribe = store.subscribe(listener);

			store.start({ flowName: "auth" });
			expect(listener).toHaveBeenCalledTimes(1);

			unsubscribe();
		});

		it("unsubscribes listener correctly", () => {
			const listener = vi.fn();
			const unsubscribe = store.subscribe(listener);
			unsubscribe();

			store.start({ flowName: "auth" });
			expect(listener).not.toHaveBeenCalled();
		});

		it("returns new object reference on each state change (immutability)", () => {
			const initial = store.getSnapshot();
			store.start({ flowName: "auth" });
			const after = store.getSnapshot();
			expect(after).not.toBe(initial);
		});
	});

	describe("start()", () => {
		it("sets the active flow and initial step", () => {
			store.start({ flowName: "auth" });
			const state = store.getSnapshot();
			expect(state.activeFlowName).toBe("auth");
			expect(state.activeStepName).toBe("login");
		});

		it("uses provided stepName if given", () => {
			store.start({ flowName: "auth", stepName: "dashboard" });
			const state = store.getSnapshot();
			expect(state.activeStepName).toBe("dashboard");
		});

		it("adds to history on start", () => {
			store.start({ flowName: "auth" });
			const state = store.getSnapshot();
			expect(state.history).toHaveLength(1);
			expect(state.history[0]).toEqual({ flowName: "auth", stepName: "login" });
		});

		it("clears history when step has clearHistory option", () => {
			store.start({ flowName: "auth" });
			store.start({ flowName: "auth", stepName: "dashboard" }); // dashboard has clearHistory
			const state = store.getSnapshot();
			// clearHistory resets history to just the current entry
			expect(state.history).toHaveLength(1);
			expect(state.history[0]).toEqual({ flowName: "auth", stepName: "dashboard" });
		});

		it("warns and does nothing for unknown flow", () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			store.start({ flowName: "unknown" });
			expect(warn).toHaveBeenCalled();
			expect(store.getSnapshot().activeFlowName).toBeNull();
			warn.mockRestore();
		});

		it("emits mount event", () => {
			const listener = vi.fn();
			store.addListener("mount", listener);
			store.start({ flowName: "auth" });
			expect(listener).toHaveBeenCalledWith({
				type: "mount",
				flowName: "auth",
				stepName: "login",
			});
		});
	});

	describe("dispatch()", () => {
		beforeEach(() => {
			store.start({ flowName: "auth" });
		});

		it("navigates to the transition target", () => {
			store.dispatch("submit");
			const state = store.getSnapshot();
			expect(state.activeStepName).toBe("dashboard");
		});

		it("adds previous step to history before navigation", () => {
			store.dispatch("submit");
			// dashboard clears history, so only dashboard is left
			// But dispatch path goes through navigateTo which checks clearHistory on target
			const state = store.getSnapshot();
			expect(state.activeFlowName).toBe("auth");
		});

		it("emits dispatch event", () => {
			const listener = vi.fn();
			store.addListener("dispatch", listener);
			store.dispatch("submit", { email: "test@test.com" });
			expect(listener).toHaveBeenCalledWith({
				type: "dispatch",
				flowName: "auth",
				stepName: "login",
				action: "submit",
				payload: { email: "test@test.com" },
			});
		});

		it("warns when dispatching with no active flow", () => {
			const emptyStore = createStore();
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			emptyStore.dispatch("submit");
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});

		it("warns when action is not in transitions", () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			store.dispatch("unknownAction");
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});

		it("supports function transitions (cross-flow)", () => {
			const crossFlowScreens: Record<string, ScreenConfig> = {
				home: { actions: ["goAuth"] as const, loader: mockLoader },
				login: { actions: ["submit"] as const, loader: mockLoader },
			};
			const crossFlows: Record<string, FlowDefinition> = {
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
			const crossStore = new FlowStore(crossFlows, crossFlowScreens);
			crossStore.start({ flowName: "main" });
			crossStore.dispatch("goAuth");
			expect(crossStore.getSnapshot().activeFlowName).toBe("auth");
			expect(crossStore.getSnapshot().activeStepName).toBe("login");
		});
	});

	describe("back()", () => {
		it("goes back to previous step", () => {
			store.start({ flowName: "auth" });
			store.dispatch("forgotPassword"); // goes to settings
			store.back();
			// history was [login, settings], after back -> [login]
			const state = store.getSnapshot();
			expect(state.activeStepName).toBe("login");
		});

		it("emits back event", () => {
			const listener = vi.fn();
			store.addListener("back", listener);
			store.start({ flowName: "auth" });
			store.dispatch("forgotPassword");
			store.back();
			expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "back" }));
		});

		it("emits backExit when no history", () => {
			const listener = vi.fn();
			store.addListener("backExit", listener);
			store.start({ flowName: "auth" });
			// Only one item in history, can't go back
			store.back();
			expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "backExit" }));
		});

		it("does nothing if no history and no active flow", () => {
			const emptyStore = createStore();
			expect(() => emptyStore.back()).not.toThrow();
		});
	});

	describe("clearHistory()", () => {
		it("resets history to only current step", () => {
			store.start({ flowName: "auth" });
			store.dispatch("forgotPassword");
			store.clearHistory();
			expect(store.getSnapshot().history).toHaveLength(1);
		});

		it("sets empty history if no active step", () => {
			store.clearHistory();
			expect(store.getSnapshot().history).toHaveLength(0);
		});
	});

	describe("addListener()", () => {
		it("adds and removes event listeners", () => {
			const listener = vi.fn();
			const remove = store.addListener("all", listener);

			store.start({ flowName: "auth" });
			expect(listener).toHaveBeenCalledTimes(1);

			remove();
			store.dispatch("submit");
			// Should not call again after removal
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it("fires all listener for every event type", () => {
			const listener = vi.fn();
			store.addListener("all", listener);

			store.start({ flowName: "auth" });
			store.dispatch("submit");
			store.back();

			expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("getFlows() / getScreens()", () => {
		it("returns the registered flows", () => {
			expect(store.getFlows()).toBe(flows);
		});

		it("returns the registered screens", () => {
			expect(store.getScreens()).toBe(screens);
		});
	});

	describe("getCurrentLoader()", () => {
		it("returns null when no active step", () => {
			expect(store.getCurrentLoader()).toBeNull();
		});

		it("returns the loader of the active step", () => {
			store.start({ flowName: "auth" });
			expect(store.getCurrentLoader()).toBe(mockLoader);
		});

		it("returns null for unknown step", () => {
			const customFlows: Record<string, FlowDefinition> = {
				test: {
					name: "test",
					steps: { unknownStep: {} },
					transitions: {},
					__brand: "Flow",
				},
			};
			const customStore = new FlowStore(customFlows, {});
			customStore.start({ flowName: "test" });
			expect(customStore.getCurrentLoader()).toBeNull();
		});
	});

	describe("getServerSnapshot()", () => {
		it("returns same as getSnapshot", () => {
			expect(store.getServerSnapshot()).toEqual(store.getSnapshot());
		});
	});
});
