import { ArrowDownAZ, ArrowUpDown, Calendar, HardDrive, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SortField } from './types'

interface SortDropdownProps {
    sortBy: SortField
    sortOrder: 'asc' | 'desc'
    onSortChange: (sortBy: SortField, sortOrder: 'asc' | 'desc') => void
}

const sortOptions: { value: SortField; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'name', label: 'Name', icon: ArrowDownAZ },
    { value: 'date', label: 'Date modified', icon: Calendar },
    { value: 'size', label: 'Size', icon: HardDrive },
    { value: 'type', label: 'Type', icon: FileType },
]

/**
 * Dropdown for selecting sort field and order
 */
export function SortDropdown({ sortBy, sortOrder, onSortChange }: SortDropdownProps) {
    const currentSort = sortOptions.find((opt) => opt.value === sortBy)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{currentSort?.label ?? 'Sort'}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={(value) => onSortChange(value as SortField, sortOrder)}
                >
                    {sortOptions.map((option) => (
                        <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                            className="gap-2"
                        >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={sortOrder}
                    onValueChange={(value) => onSortChange(sortBy, value as 'asc' | 'desc')}
                >
                    <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
