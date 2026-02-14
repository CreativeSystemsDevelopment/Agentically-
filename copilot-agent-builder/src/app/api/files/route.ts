import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const dirPath = request.nextUrl.searchParams.get('path') || '/workspace';

  try {
    // For demo, return mock file tree
    const fileTree = {
      name: 'project',
      path: '/workspace/project',
      type: 'directory' as const,
      children: [
        {
          name: 'src',
          path: '/workspace/project/src',
          type: 'directory' as const,
          children: [
            {
              name: 'components',
              path: '/workspace/project/src/components',
              type: 'directory' as const,
              children: [
                { name: 'Button.tsx', path: '/workspace/project/src/components/Button.tsx', type: 'file' as const, extension: 'tsx' },
                { name: 'Header.tsx', path: '/workspace/project/src/components/Header.tsx', type: 'file' as const, extension: 'tsx' },
                { name: 'Sidebar.tsx', path: '/workspace/project/src/components/Sidebar.tsx', type: 'file' as const, extension: 'tsx' },
              ],
            },
            {
              name: 'lib',
              path: '/workspace/project/src/lib',
              type: 'directory' as const,
              children: [
                { name: 'utils.ts', path: '/workspace/project/src/lib/utils.ts', type: 'file' as const, extension: 'ts' },
                { name: 'api.ts', path: '/workspace/project/src/lib/api.ts', type: 'file' as const, extension: 'ts' },
              ],
            },
            {
              name: 'app',
              path: '/workspace/project/src/app',
              type: 'directory' as const,
              children: [
                { name: 'page.tsx', path: '/workspace/project/src/app/page.tsx', type: 'file' as const, extension: 'tsx' },
                { name: 'layout.tsx', path: '/workspace/project/src/app/layout.tsx', type: 'file' as const, extension: 'tsx' },
                { name: 'globals.css', path: '/workspace/project/src/app/globals.css', type: 'file' as const, extension: 'css' },
              ],
            },
          ],
        },
        { name: 'package.json', path: '/workspace/project/package.json', type: 'file' as const, extension: 'json' },
        { name: 'tsconfig.json', path: '/workspace/project/tsconfig.json', type: 'file' as const, extension: 'json' },
        { name: 'README.md', path: '/workspace/project/README.md', type: 'file' as const, extension: 'md' },
        { name: '.gitignore', path: '/workspace/project/.gitignore', type: 'file' as const, extension: '' },
      ],
    };

    return NextResponse.json({ files: fileTree });
  } catch {
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, filePath, content } = body;

  if (action === 'read') {
    // Return mock file content
    const mockContents: Record<string, string> = {
      'page.tsx': `'use client';\n\nimport { useState } from 'react';\n\nexport default function Page() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className="flex min-h-screen flex-col items-center justify-center">\n      <h1 className="text-4xl font-bold">Welcome to My App</h1>\n      <p className="mt-4 text-lg text-gray-600">Count: {count}</p>\n      <button\n        onClick={() => setCount(c => c + 1)}\n        className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"\n      >\n        Increment\n      </button>\n    </div>\n  );\n}`,
      'utils.ts': `export function cn(...classes: (string | undefined | false)[]) {\n  return classes.filter(Boolean).join(' ');\n}\n\nexport function formatDate(date: Date): string {\n  return new Intl.DateTimeFormat('en-US', {\n    year: 'numeric',\n    month: 'long',\n    day: 'numeric',\n  }).format(date);\n}\n\nexport async function sleep(ms: number) {\n  return new Promise(resolve => setTimeout(resolve, ms));\n}`,
      'api.ts': `const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';\n\nexport async function fetchData<T>(endpoint: string): Promise<T> {\n  const response = await fetch(\`\${BASE_URL}\${endpoint}\`);\n  if (!response.ok) throw new Error(\`HTTP \${response.status}\`);\n  return response.json();\n}\n\nexport async function postData<T>(endpoint: string, data: unknown): Promise<T> {\n  const response = await fetch(\`\${BASE_URL}\${endpoint}\`, {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(data),\n  });\n  if (!response.ok) throw new Error(\`HTTP \${response.status}\`);\n  return response.json();\n}`,
    };

    const fileName = filePath?.split('/').pop() || '';
    const fileContent = mockContents[fileName] || `// ${fileName}\n// File content would be loaded here`;

    return NextResponse.json({ content: fileContent });
  }

  return NextResponse.json({ success: true });
}
