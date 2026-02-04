import type { RenderOptions } from "@testing-library/react";
import { render, renderHook as renderHookRTL } from "@testing-library/react";
import type { ReactNode } from "react";

import { api } from "@/lib/api";
import { type createTestQueryClient, TestProviders } from "../utils";

interface RouterProvidersProps {
	children: ReactNode;
	queryClient?: ReturnType<typeof createTestQueryClient>;
}

export function RouterProviders({ children, queryClient }: RouterProvidersProps) {
	return <TestProviders queryClient={queryClient}>{children}</TestProviders>;
}

export function renderWithRouter(
	ui: ReactNode,
	options?: RenderOptions & { queryClient?: ReturnType<typeof createTestQueryClient> },
) {
	return render(ui, {
		wrapper: ({ children }) => (
			<RouterProviders queryClient={options?.queryClient}>{children}</RouterProviders>
		),
		...options,
	});
}

export function renderHookWithRouter<TResult, TProps>(
	hook: (props: TProps) => TResult,
	options?: {
		initialProps?: TProps;
		queryClient?: ReturnType<typeof createTestQueryClient>;
	},
) {
	return renderHookRTL(hook, {
		wrapper: ({ children }) => (
			<RouterProviders queryClient={options?.queryClient}>{children}</RouterProviders>
		),
		...options,
	});
}

export function setupMockAuth() {
	api.setAccessToken("test-token");
	localStorage.setItem("petrel_access_token", "test-token");
	localStorage.setItem("petrel_refresh_token", "test-refresh-token");
}

export function cleanupMockAuth() {
	api.setAccessToken(null);
	localStorage.removeItem("petrel_access_token");
	localStorage.removeItem("petrel_refresh_token");
}
