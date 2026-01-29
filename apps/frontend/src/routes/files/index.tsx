import { createFileRoute } from '@tanstack/react-router'
import { FileBrowser } from '@/components/file-browser'

export const Route = createFileRoute('/files/')({
    component: FilesPage,
})

function FilesPage() {
    return (
        <div>
            <h1 className="mb-6 text-2xl font-semibold">Files</h1>
            <FileBrowser />
        </div>
    )
}
