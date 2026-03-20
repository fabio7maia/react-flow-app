import { describe, expect, it } from "vitest";
import { defineScreens } from "../defineScreens";

describe("defineScreens", () => {
	it("adds name and __brand to each screen", () => {
		const screens = defineScreens({
			login: {
				actions: ["submit", "forgotPassword"] as const,
				loader: () => Promise.resolve({ default: () => null as any }),
			},
			dashboard: {
				actions: ["logout"] as const,
				loader: () => Promise.resolve({ default: () => null as any }),
			},
		});

		expect(screens.login.name).toBe("login");
		expect(screens.login.__brand).toBe("Screen");
		expect(screens.dashboard.name).toBe("dashboard");
		expect(screens.dashboard.__brand).toBe("Screen");
	});

	it("preserves the original actions array", () => {
		const screens = defineScreens({
			login: {
				actions: ["submit", "cancel"] as const,
				loader: () => Promise.resolve({ default: () => null as any }),
			},
		});

		expect(screens.login.actions).toEqual(["submit", "cancel"]);
	});

	it("preserves meta data", () => {
		const screens = defineScreens({
			login: {
				actions: [] as const,
				loader: () => Promise.resolve({ default: () => null as any }),
				meta: { requiresAuth: false, title: "Login" },
			},
		});

		expect(screens.login.meta).toEqual({ requiresAuth: false, title: "Login" });
	});

	it("handles empty screens object", () => {
		const screens = defineScreens({});
		expect(Object.keys(screens)).toHaveLength(0);
	});

	it("preserves the loader function", async () => {
		const mockComponent = () => null as any;
		const loader = () => Promise.resolve({ default: mockComponent });

		const screens = defineScreens({
			test: {
				actions: [] as const,
				loader,
			},
		});

		const result = await screens.test.loader();
		expect(result.default).toBe(mockComponent);
	});
});
