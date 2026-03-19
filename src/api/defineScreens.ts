import type { InferredScreens, ScreenConfig } from "../types/core";

/**
 * Factory function to define screens with full TypeScript inference.
 *
 * @example
 * ```ts
 * const screens = defineScreens({
 *   login: {
 *     actions: ['submit', 'forgotPassword'] as const,
 *     loader: () => import('./LoginScreen'),
 *   },
 *   dashboard: {
 *     actions: ['logout', 'settings'] as const,
 *     loader: () => import('./DashboardScreen'),
 *   },
 * });
 * // screens.login.actions = readonly ['submit', 'forgotPassword']
 * // screens.login.name = 'login'
 * ```
 */
export function defineScreens<TConfig extends Record<string, ScreenConfig>>(
	config: TConfig
): InferredScreens<TConfig> {
	const result = {} as InferredScreens<TConfig>;

	for (const [name, screenConfig] of Object.entries(config)) {
		(result as Record<string, unknown>)[name] = {
			...screenConfig,
			name,
			__brand: "Screen" as const,
		};
	}

	return result;
}
