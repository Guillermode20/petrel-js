/**
 * Re-exports from the consolidated test utilities.
 * Prefer importing directly from "tests/utils" instead.
 */
export {
	TestProviders as RouterProviders,
	renderWithProviders as renderWithRouter,
	renderHook as renderHookWithRouter,
	setupMockAuth,
	cleanupMockAuth,
} from "../utils";
