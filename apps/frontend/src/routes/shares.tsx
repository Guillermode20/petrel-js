import { createFileRoute } from "@tanstack/react-router";
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
			<ShareTable shares={shares ?? []} isLoading={isLoading} onDelete={handleDelete} />
		</div>
	);
}
