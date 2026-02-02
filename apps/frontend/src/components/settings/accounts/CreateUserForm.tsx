import type { UserRole } from "@petrel/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface CreateUserFormProps {
	onSubmit: (data: { username: string; password: string; role: UserRole }) => void;
	onCancel: () => void;
}

export function CreateUserForm({ onSubmit, onCancel }: CreateUserFormProps) {
	const queryClient = useQueryClient();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<UserRole>("user");

	const createMutation = useMutation({
		mutationFn: (data: { username: string; password: string; role: UserRole }) =>
			api.createUser(data),
		onSuccess: () => {
			toast.success("User created successfully");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setUsername("");
			setPassword("");
			setRole("user");
			onSubmit({ username, password, role });
		},
		onError: (err: Error) => {
			toast.error(err.message);
		},
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (username.length < 3 || username.length > 50) {
			toast.error("Username must be between 3 and 50 characters");
			return;
		}
		if (password.length < 8 || password.length > 100) {
			toast.error("Password must be between 8 and 100 characters");
			return;
		}
		createMutation.mutate({ username, password, role });
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="username">Username</Label>
				<Input
					id="username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					placeholder="Enter username (3-50 characters)"
					required
					minLength={3}
					maxLength={50}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="password">Password</Label>
				<Input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Enter password (8-100 characters)"
					required
					minLength={8}
					maxLength={100}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="role">Role</Label>
				<Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
					<SelectTrigger id="role">
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
				<Button type="submit" disabled={createMutation.isPending}>
					{createMutation.isPending ? "Creating..." : "Create User"}
				</Button>
			</div>
		</form>
	);
}
