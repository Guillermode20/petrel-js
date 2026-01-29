import { createFileRoute } from '@tanstack/react-router'
import { FileBrowser } from '@/components/file-browser'

export const Route = createFileRoute('/files/')({
    component: FilesPage,
})

function FilesPage() {
    return (
        <FileBrowser />
    )
}
