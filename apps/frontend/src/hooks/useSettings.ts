import type { UserSettings } from "@petrel/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";

export const settingsKeys = {
	all: ["settings"] as const,
};

export function useSettings() {
	const { isAuthenticated } = useAuth();

	return useQuery<UserSettings>({
		queryKey: settingsKeys.all,
		queryFn: async (): Promise<UserSettings> => {
			if (isAuthenticated) {
				return api.getSettings();
			}

			const defaultSettings = await api.getDefaultSettings();
			return { userId: 0, ...defaultSettings } as UserSettings;
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

export function useUpdateSettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (updates: Partial<UserSettings>) => api.updateSettings(updates),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: settingsKeys.all });
		},
	});
}

export function useResetSettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => api.resetSettings(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: settingsKeys.all });
		},
	});
}
