import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

/**
 * Search bar for filtering files
 */
export function SearchBar({
	value,
	onChange,
	placeholder = "Search files...",
	className,
}: SearchBarProps) {
	return (
		<div className={`relative ${className ?? ""}`}>
			<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="h-8 w-full pl-9 pr-8"
			/>
			{value && (
				<Button
					variant="ghost"
					size="icon"
					className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
					onClick={() => onChange("")}
				>
					<X className="h-3 w-3" />
					<span className="sr-only">Clear search</span>
				</Button>
			)}
		</div>
	);
}
