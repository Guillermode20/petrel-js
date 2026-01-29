import { createFileRoute } from '@tanstack/react-router'
import { FileBrowser } from '@/components/file-browser'

export const Route = createFileRoute('/files/$folderId')({
    component: FolderPage,
})

function FolderPage() {
    const { folderId } = Route.useParams()

    return (
        <div>
            <FileBrowser folderId={Number(folderId)} />
        </div>
    )
}
