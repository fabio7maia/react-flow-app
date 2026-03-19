import type { FlowConfig, FlowDefinition, ScreenConfig } from "../types/core";

/**
 * Factory function to define a flow with type-safe transitions.
 *
 * @example
 * ```ts
 * const authFlow = defineFlow({
 *   name: 'auth',
 *   baseUrl: '/auth',
 *   steps: {
 *     login: { initialStep: true },
 *     dashboard: { clearHistory: true },
 *   },
 *   transitions: {
 *     login: { submit: 'dashboard' },
 *     dashboard: { logout: 'login' },
 *   },
 * });
 * ```
 */
export function defineFlow<
	TScreens extends Record<string, ScreenConfig>,
	TName extends string = string,
>(config: FlowConfig<TScreens, TName>): FlowDefinition<TScreens, TName> {
	return {
		...config,
		__brand: "Flow" as const,
	};
}
