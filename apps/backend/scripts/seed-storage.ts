import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { db } from '../db';
import { folderService } from '../src/services/folder.service';
import { fileService } from '../src/services/file.service';
import { getStorageRoot, resolveStoragePath } from '../src/lib/storage';

interface MockFile {
  name: string;
  content: string;
  mimeType: string;
}

interface MockFolder {
  name: string;
  files: MockFile[];
  subfolders?: MockFolder[];
}

const mockData: MockFolder[] = [
  {
    name: 'Documents',
    files: [
      {
        name: 'readme.txt',
        content: 'Welcome to Petrel!\n\nThis is a mock file for testing purposes.',
        mimeType: 'text/plain',
      },
      {
        name: 'notes.txt',
        content: 'Meeting notes:\n- Discussed project roadmap\n- Assigned tasks\n- Set deadlines',
        mimeType: 'text/plain',
      },
      {
        name: 'todo.txt',
        content: 'TODO:\n1. Review documentation\n2. Test file upload\n3. Fix bugs',
        mimeType: 'text/plain',
      },
    ],
    subfolders: [
      {
        name: 'Work',
        files: [
          {
            name: 'project-plan.txt',
            content: 'Project Plan:\n\nPhase 1: Setup\nPhase 2: Development\nPhase 3: Testing\nPhase 4: Deployment',
            mimeType: 'text/plain',
          },
          {
            name: 'meeting-notes.txt',
            content: 'Meeting Notes - 2024-01-15\n\nAttendees: Team A\nAgenda: Sprint planning\n\nAction items:\n- Complete feature X\n- Review PRs',
            mimeType: 'text/plain',
          },
        ],
      },
      {
        name: 'Personal',
        files: [
          {
            name: 'journal.txt',
            content: 'Journal Entry:\n\nToday was productive. Worked on the new file sharing feature.',
            mimeType: 'text/plain',
          },
        ],
      },
    ],
  },
  {
    name: 'Projects',
    files: [
      {
        name: 'project-ideas.md',
        content: '# Project Ideas\n\n## Idea 1: File Manager\nA modern file manager with sharing capabilities.\n\n## Idea 2: Media Server\nStreaming media server with transcoding support.',
        mimeType: 'text/markdown',
      },
      {
        name: 'architecture.md',
        content: '# Architecture\n\n## Components\n\n- Frontend: React + TypeScript\n- Backend: Elysia + Bun\n- Database: SQLite\n\n## Data Flow\n\nClient → API → Service → Database',
        mimeType: 'text/markdown',
      },
    ],
    subfolders: [
      {
        name: 'Web-App',
        files: [
          {
            name: 'config.md',
            content: '# Configuration\n\n```json\n{\n  "port": 3000,\n  "storage": "./storage"\n}\n```',
            mimeType: 'text/markdown',
          },
          {
            name: 'features.md',
            content: '# Features\n\n- File upload\n- Folder organization\n- Sharing links\n- Thumbnail generation',
            mimeType: 'text/markdown',
          },
          {
            name: 'api-docs.md',
            content: '# API Documentation\n\n## Endpoints\n\n### POST /api/files/upload\nUpload a file.\n\n### GET /api/files/:id\nGet file metadata.',
            mimeType: 'text/markdown',
          },
        ],
      },
      {
        name: 'Mobile-App',
        files: [
          {
            name: 'setup.md',
            content: '# Setup Instructions\n\n1. Clone the repository\n2. Install dependencies\n3. Run the dev server',
            mimeType: 'text/markdown',
          },
        ],
      },
    ],
  },
  {
    name: 'Notes',
    files: [
      {
        name: 'quick-notes.md',
        content: '# Quick Notes\n\n## Important\n- Remember to backup data\n- Check logs regularly\n\n## Ideas\n- Add dark mode\n- Improve search',
        mimeType: 'text/markdown',
      },
      {
        name: 'learning.md',
        content: '# Learning Resources\n\n## TypeScript\n- Official docs\n- Handbook\n\n## React\n- Tutorial\n- Best practices',
        mimeType: 'text/markdown',
      },
    ],
  },
  {
    name: 'Code',
    files: [
      {
        name: 'example.js',
        content: 'console.log("Hello, World!");\n\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n',
        mimeType: 'text/javascript',
      },
      {
        name: 'utils.ts',
        content: 'export function formatDate(date: Date): string {\n  return date.toISOString();\n}\n\nexport function capitalize(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}\n',
        mimeType: 'text/typescript',
      },
    ],
  },
];

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function createFileInStorage(
  folderPath: string,
  file: MockFile,
  parentId: number | null
): Promise<void> {
  const relativePath = folderPath ? path.join(folderPath, file.name) : file.name;
  const absolutePath = resolveStoragePath(relativePath);
  const hash = computeHash(file.content);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, file.content, 'utf-8');

  await fileService.createFile({
    name: file.name,
    path: folderPath,
    size: Buffer.byteLength(file.content, 'utf-8'),
    mimeType: file.mimeType,
    hash,
    uploadedBy: null,
    parentId,
    metadata: null,
  });

  console.log(`Created file: ${relativePath}`);
}

async function createFolderStructure(
  folder: MockFolder,
  parentPath: string | null,
  parentId: number | null
): Promise<void> {
  const folderPath = parentPath ? path.join(parentPath, folder.name) : folder.name;

  const folderRecord = await folderService.createFolder({
    name: folder.name,
    parentPath,
    ownerId: null,
  });

  console.log(`Created folder: ${folderPath}`);

  for (const file of folder.files) {
    await createFileInStorage(folderPath, file, folderRecord.id);
  }

  if (folder.subfolders) {
    for (const subfolder of folder.subfolders) {
      await createFolderStructure(subfolder, folderPath, folderRecord.id);
    }
  }
}

async function seedStorage(): Promise<void> {
  console.log('Seeding storage with mock data...');

  for (const folder of mockData) {
    await createFolderStructure(folder, null, null);
  }

  console.log('Storage seeding complete!');
}

seedStorage().catch((error) => {
  console.error('Error seeding storage:', error);
  process.exit(1);
});
