import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { RenderOptions } from "@testing-library/react";
import { render, renderHook as renderHookRTL } from "@testing-library/react";
import type React from "react";

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: Infinity,
				refetchOnWindowFocus: false,
			},
		},
	});
}

interface TestProvidersProps {
	children: React.ReactNode;
	queryClient?: QueryClient;
}

function TestProviders({ children, queryClient }: TestProvidersProps) {
	const client = queryClient ?? createTestQueryClient();
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
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
