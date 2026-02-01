import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { LoginForm } from "../components/auth/LoginForm";
import { GlobalContextMenu, useGlobalContextMenuOnAction } from "../components/global-context-menu";
import { Header } from "../components/Header";
import { Sidebar } from "../components/navigation/Sidebar";
import { useAuth } from "../hooks/useAuth";

/**
 * Check if current path is a public route that doesn't require auth
 */
function isPublicRoute(pathname: string): boolean {
	return pathname.startsWith("/s/");
}

function RootComponent() {
	const { isAuthenticated, isLoading } = useAuth();
	const routerState = useRouterState();
	const pathname = routerState.location.pathname;
	const handleContextMenuAction = useGlobalContextMenuOnAction();

	// Public routes bypass auth check
	if (isPublicRoute(pathname)) {
		return (
			<>
				<Outlet />
				<GlobalContextMenu onAction={handleContextMenuAction} />
			</>
		);
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <LoginForm />;
	}

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<Header />
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<main className="flex flex-1 flex-col overflow-hidden">
					<div className="flex-1 overflow-auto">
						<div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
							<Outlet />
						</div>
					</div>
					<div id="bottom-bar-portal" />
				</main>
			</div>
			<GlobalContextMenu onAction={handleContextMenuAction} />
		</div>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
