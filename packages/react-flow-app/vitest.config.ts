import { defineConfig } from "vitest/config";

export default defineConfig({
	esbuild: {
		jsx: "automatic",
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/setupTests.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.stories.{ts,tsx}",
				"src/**/*.test.{ts,tsx}",
				"src/**/*.spec.{ts,tsx}",
				"src/setupTests.ts",
				"src/__stories__/**",
				"src/storybook/**",
				"src/index.ts",
				"src/types/index.ts",
				"src/diagram/index.ts",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
	},
	resolve: {
		alias: {
			"@react-flow-app/core": new URL("./src", import.meta.url).pathname,
		},
	},
});
