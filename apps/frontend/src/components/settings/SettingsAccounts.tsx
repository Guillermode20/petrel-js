import type { User, UserRole } from "@petrel/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateUserForm } from "./accounts/CreateUserForm.tsx";
import { DeleteUserModal } from "./accounts/DeleteUserModal.tsx";
import { EditUserForm } from "./accounts/EditUserForm.tsx";
import { UserList } from "./accounts/UserList.tsx";

interface SettingsAccountsProps {
	currentUserRole: UserRole;
}

type DialogState = "create" | "edit" | "delete" | null;

export function SettingsAccounts({ currentUserRole }: SettingsAccountsProps) {
	if (currentUserRole !== "admin") {
		return (
			<div className="text-muted-foreground">
				You need admin permissions to manage user accounts.
			</div>
		);
	}

	const [dialogState, setDialogState] = useState<DialogState>(null);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);

	function handleCreateUser() {
		setDialogState("create");
	}

	function handleEditUser(user: User) {
		setSelectedUser(user);
		setDialogState("edit");
	}

	function handleDeleteUser(user: User) {
		setSelectedUser(user);
		setDialogState("delete");
	}

	function handleCloseDialog() {
		setDialogState(null);
		setSelectedUser(null);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold">User Accounts</h3>
					<p className="text-muted-foreground text-sm">Manage user accounts and permissions</p>
				</div>
				<Button onClick={handleCreateUser} size="sm">
					<Plus className="mr-2 size-4" />
					New User
				</Button>
			</div>

			<UserList onEdit={handleEditUser} onDelete={handleDeleteUser} />

			<Dialog open={dialogState === "create"} onOpenChange={handleCloseDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New User</DialogTitle>
					</DialogHeader>
					<CreateUserForm onSubmit={handleCloseDialog} onCancel={handleCloseDialog} />
				</DialogContent>
			</Dialog>

			<Dialog open={dialogState === "edit"} onOpenChange={handleCloseDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit User Role</DialogTitle>
					</DialogHeader>
					{selectedUser && (
						<EditUserForm
							user={selectedUser}
							onSubmit={handleCloseDialog}
							onCancel={handleCloseDialog}
						/>
					)}
				</DialogContent>
			</Dialog>

			{selectedUser && (
				<DeleteUserModal
					user={selectedUser}
					isOpen={dialogState === "delete"}
					onConfirm={handleCloseDialog}
					onCancel={handleCloseDialog}
				/>
			)}
		</div>
	);
}
