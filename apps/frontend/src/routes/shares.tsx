import { createFileRoute } from "@tanstack/react-router";
import { Link } from "lucide-react";
import { toast } from "sonner";
import { ShareTable } from "@/components/sharing";
import { useDeleteShare, useShares } from "@/hooks";

export const Route = createFileRoute("/shares")({
	component: SharesPage,
});

function SharesPage() {
	const { data: shares, isLoading } = useShares();
	const deleteShareMutation = useDeleteShare();

	async function handleDelete(shareId: number): Promise<void> {
		try {
			await deleteShareMutation.mutateAsync(shareId);
			toast.success("Share link deleted");
		} catch (_err) {
			toast.error("Failed to delete share link");
		}
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold flex items-center gap-2">
						<Link className="h-6 w-6" />
						Share Links
					</h1>
					<p className="text-muted-foreground mt-1">Manage your shared files and links</p>
				</div>
			</div>

			<ShareTable shares={shares ?? []} isLoading={isLoading} onDelete={handleDelete} />
		</div>
	);
}
