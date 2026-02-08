import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { RenderOptions } from "@testing-library/react";
import { render, renderHook as renderHookRTL } from "@testing-library/react";
import type React from "react";

import { api } from "@/lib/api";

export function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: Infinity,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: false,
			},
		},
	});
}

interface TestProvidersProps {
	children: React.ReactNode;
	queryClient?: QueryClient;
}

export function TestProviders({ children, queryClient }: TestProvidersProps): React.ReactElement {
	const client = queryClient ?? createTestQueryClient();
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function createWrapper(queryClient?: QueryClient): React.FC<{ children: React.ReactNode }> {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <TestProviders queryClient={queryClient}>{children}</TestProviders>;
	};
}

export function renderWithProviders(
	ui: React.ReactElement,
	options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient },
) {
	return render(ui, {
		wrapper: ({ children }) => (
			<TestProviders queryClient={options?.queryClient}>{children}</TestProviders>
		),
		...options,
	});
}

export function renderHook<TResult, TProps>(
	hook: (props: TProps) => TResult,
	options?: {
		initialProps?: TProps;
		queryClient?: QueryClient;
	},
) {
	return renderHookRTL(hook, {
		wrapper: ({ children }) => (
			<TestProviders queryClient={options?.queryClient}>{children}</TestProviders>
		),
		...options,
	});
}

export function setupMockAuth(): void {
	api.setAccessToken("test-token");
	localStorage.setItem("petrel_access_token", "test-token");
	localStorage.setItem("petrel_refresh_token", "test-refresh-token");
}

export function cleanupMockAuth(): void {
	api.setAccessToken(null);
	localStorage.removeItem("petrel_access_token");
	localStorage.removeItem("petrel_refresh_token");
}
