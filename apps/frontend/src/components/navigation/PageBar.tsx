import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PageBarProps {
    children: ReactNode;
    className?: string;
}

/**
 * PageBar - Consistent bar locked at the bottom of the UI
 * 
 * Used for pagination, selection info, or other view-specific controls.
 * Portals itself to the #bottom-bar-portal in the root layout if present.
 */
export function PageBar({ children, className }: PageBarProps) {
    const portalRoot = document.getElementById("bottom-bar-portal");

    const content = (
        <div
            className={cn(
                "w-full border-t border-border bg-card/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/75",
                className
            )}
        >
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
                {children}
            </div>
        </div>
    );

    if (portalRoot) {
        return createPortal(content, portalRoot);
    }

    return content;
}
