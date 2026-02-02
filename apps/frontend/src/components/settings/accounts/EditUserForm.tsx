import type { User, UserRole } from "@petrel/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface EditUserFormProps {
	user: User;
	onSubmit: () => void;
	onCancel: () => void;
}

export function EditUserForm({ user, onSubmit, onCancel }: EditUserFormProps) {
	const queryClient = useQueryClient();
	const [role, setRole] = useState<UserRole>(user.role);

	const updateMutation = useMutation({
		mutationFn: (data: { role: UserRole }) => api.updateUser(user.id, data),
		onSuccess: () => {
			toast.success("User role updated successfully");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			onSubmit();
		},
		onError: (err: Error) => {
			toast.error(err.message);
		},
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		updateMutation.mutate({ role });
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label>Username</Label>
				<div className="text-muted-foreground">{user.username}</div>
			</div>
			<div className="space-y-2">
				<Label>Role</Label>
				<Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="admin">Admin - Full access</SelectItem>
						<SelectItem value="manager">Manager - Can manage files</SelectItem>
						<SelectItem value="editor">Editor - Can manage files</SelectItem>
						<SelectItem value="user">User - Can upload and share</SelectItem>
						<SelectItem value="viewer">Viewer - Read-only access</SelectItem>
						<SelectItem value="guest">Guest - Limited access</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="flex gap-2 justify-end">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={updateMutation.isPending}>
					{updateMutation.isPending ? "Updating..." : "Update Role"}
				</Button>
			</div>
		</form>
	);
}
