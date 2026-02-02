import type { User } from "@petrel/shared";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

interface UserListProps {
	onEdit: (user: User) => void;
	onDelete: (user: User) => void;
}

export function UserList({ onEdit, onDelete }: UserListProps) {
	const { data: users, isLoading } = useQuery({
		queryKey: ["users"],
		queryFn: () => api.getUsers(),
	});

	if (isLoading) {
		return <div className="text-muted-foreground">Loading users...</div>;
	}

	if (!users || users.length === 0) {
		return <div className="text-muted-foreground">No users found</div>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Username</TableHead>
					<TableHead>Role</TableHead>
					<TableHead>Created</TableHead>
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{users.map((user) => (
					<TableRow key={user.id}>
						<TableCell className="font-medium">{user.username}</TableCell>
						<TableCell>
							<span
								className={`rounded px-2 py-0.5 text-xs ${
									user.role === "admin"
										? "bg-destructive/10 text-destructive"
										: user.role === "manager" || user.role === "editor"
											? "bg-primary/10 text-primary"
											: "bg-muted"
								}`}
							>
								{user.role}
							</span>
						</TableCell>
						<TableCell className="text-muted-foreground text-sm">
							{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
						</TableCell>
						<TableCell className="text-right">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon">
										<MoreHorizontal className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => onEdit(user)}>Edit Role</DropdownMenuItem>
									<DropdownMenuItem className="text-destructive" onClick={() => onDelete(user)}>
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
