import type { User } from "@petrel/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface DeleteUserModalProps {
	user: User;
	isOpen: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function DeleteUserModal({ user, isOpen, onConfirm, onCancel }: DeleteUserModalProps) {
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		mutationFn: () => api.deleteUser(user.id),
		onSuccess: () => {
			toast.success("User deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			onConfirm();
		},
		onError: (err: Error) => {
			toast.error(err.message);
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={onCancel}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="text-destructive" />
						Delete User
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete <strong>{user.username}</strong>? This action cannot be
						undone and will remove all their data.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => deleteMutation.mutate()}
						disabled={deleteMutation.isPending}
					>
						{deleteMutation.isPending ? "Deleting..." : "Delete User"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
