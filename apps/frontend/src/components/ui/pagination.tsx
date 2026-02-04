import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	className?: string;
}

/**
 * Pagination component for navigating through pages of items
 */
export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
	if (totalPages <= 1) return null;

	const pages = [];
	const maxVisiblePages = 5;

	if (totalPages <= maxVisiblePages) {
		for (let i = 1; i <= totalPages; i++) {
			pages.push(i);
		}
	} else {
		// Complex pagination with ellipses
		if (currentPage <= 3) {
			pages.push(1, 2, 3, 4, "...", totalPages);
		} else if (currentPage >= totalPages - 2) {
			pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
		} else {
			pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
		}
	}

	return (
		<nav
			className={cn("flex items-center justify-center space-x-1", className)}
			aria-label="Pagination"
		>
			<Button
				variant="outline"
				size="icon"
				className="h-8 w-8"
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage <= 1}
			>
				<ChevronLeft className="h-4 w-4" />
				<span className="sr-only">Previous page</span>
			</Button>

			{pages.map((page, index) => (
				<span
					key={
						index === 0
							? `start-${index}`
							: index === pages.length - 1
								? `end-${index}`
								: `page-${page}`
					}
				>
					{page === "..." ? (
						<div className="flex h-8 w-8 items-center justify-center">
							<MoreHorizontal className="h-4 w-4 text-muted-foreground" />
						</div>
					) : (
						<Button
							variant={currentPage === page ? "default" : "outline"}
							size="icon"
							className="h-8 w-8"
							onClick={() => onPageChange(page as number)}
						>
							{page}
						</Button>
					)}
				</span>
			))}

			<Button
				variant="outline"
				size="icon"
				className="h-8 w-8"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				<ChevronRight className="h-4 w-4" />
				<span className="sr-only">Next page</span>
			</Button>
		</nav>
	);
}
