import { Link } from "@tanstack/react-router";
import { LogOut, Upload, User } from "lucide-react";
import { useAuth } from "@/hooks";
import { MobileSidebar } from "./navigation/Sidebar";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Header() {
	const { user, isAuthenticated, logout } = useAuth();

	return (
		<header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="flex h-14 items-center justify-between px-4 lg:px-6">
				<div className="flex items-center gap-3">
					<MobileSidebar />
					<Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
						<span className="text-primary">▲</span>
						<span className="hidden sm:inline">Petrel</span>
					</Link>
					<Badge variant="secondary" className="hidden text-xs sm:inline-flex">
						v0.1.0
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
						<Link to="/files">
							<Upload className="mr-2 h-4 w-4" />
							Upload
						</Link>
					</Button>
					{isAuthenticated && user ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="rounded-full">
									<Avatar className="h-8 w-8">
										<AvatarFallback className="bg-primary text-primary-foreground text-xs">
											{user.username.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<div className="px-2 py-1.5">
									<p className="text-sm font-medium">{user.username}</p>
									<p className="text-xs text-muted-foreground">{user.role}</p>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<User className="mr-2 h-4 w-4" />
									Settings
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => logout()}>
									<LogOut className="mr-2 h-4 w-4" />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button variant="outline" size="sm">
							Log in
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}
