import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Query keys for shares
 */
export const shareKeys = {
	all: ["shares"] as const,
	lists: () => [...shareKeys.all, "list"] as const,
	details: () => [...shareKeys.all, "detail"] as const,
	detail: (token: string) => [...shareKeys.details(), token] as const,
};

/**
 * Hook for fetching user's shares
 */
export function useShares() {
	return useQuery({
		queryKey: shareKeys.lists(),
		queryFn: () => api.getMyShares(),
	});
}

/**
 * Hook for fetching a share by token (public)
 */
export function useShare(token: string, password?: string) {
	return useQuery({
		queryKey: shareKeys.detail(token),
		queryFn: () => api.getShare(token, password),
		enabled: !!token,
		retry: false,
	});
}

/**
 * Hook for creating a share
 */
export function useCreateShare() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: {
			type: "file" | "folder";
			targetId: number;
			expiresAt?: string;
			password?: string;
			allowDownload?: boolean;
			allowZip?: boolean;
			showMetadata?: boolean;
		}) => api.createShare(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: shareKeys.lists() });
		},
	});
}

/**
 * Hook for updating a share
 */
export function useUpdateShare() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number;
			data: { expiresAt?: string; password?: string; allowDownload?: boolean; allowZip?: boolean };
		}) => api.updateShare(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: shareKeys.lists() });
		},
	});
}

/**
 * Hook for deleting a share
 */
export function useDeleteShare() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => api.deleteShare(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: shareKeys.lists() });
		},
	});
}
