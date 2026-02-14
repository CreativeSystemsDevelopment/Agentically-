'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Files, Search, GitBranch, Puzzle, Bot, Terminal, AlertTriangle,
  FileOutput, ChevronRight, ChevronDown, File, Folder, FolderOpen,
  FileCode, X, Circle, Play, Square, RotateCcw, Maximize2, Minimize2,
  Send, Loader2, Wrench, Settings, MoreHorizontal
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <Loader2 className="w-6 h-6 animate-spin text-[#6366f1]" />
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  extension?: string;
}

interface OpenFile {
  path: string;
  name: string;
  language: string;
  content: string;
  modified: boolean;
}

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ProblemEntry {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  col: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_FILE_TREE: FileTreeNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'directory',
    children: [
      {
        name: 'app',
        path: 'src/app',
        type: 'directory',
        children: [
          { name: 'page.tsx', path: 'src/app/page.tsx', type: 'file', extension: 'tsx' },
          { name: 'layout.tsx', path: 'src/app/layout.tsx', type: 'file', extension: 'tsx' },
          { name: 'globals.css', path: 'src/app/globals.css', type: 'file', extension: 'css' },
        ],
      },
      {
        name: 'components',
        path: 'src/components',
        type: 'directory',
        children: [
          { name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file', extension: 'tsx' },
          { name: 'Header.tsx', path: 'src/components/Header.tsx', type: 'file', extension: 'tsx' },
        ],
      },
      {
        name: 'lib',
        path: 'src/lib',
        type: 'directory',
        children: [
          { name: 'utils.ts', path: 'src/lib/utils.ts', type: 'file', extension: 'ts' },
          { name: 'api.ts', path: 'src/lib/api.ts', type: 'file', extension: 'ts' },
        ],
      },
    ],
  },
  { name: 'package.json', path: 'package.json', type: 'file', extension: 'json' },
  { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', extension: 'json' },
  { name: 'README.md', path: 'README.md', type: 'file', extension: 'md' },
];

const MOCK_FILE_CONTENTS: Record<string, string> = {
  'src/app/page.tsx': `import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { CTA } from '@/components/CTA';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <Hero
        title="Build Smarter Agents"
        subtitle="Create, test, and deploy AI-powered coding agents with ease."
      />
      <Features />
      <CTA
        label="Get Started"
        href="/builder"
      />
    </main>
  );
}`,

  'src/app/layout.tsx': `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agent Builder',
  description: 'Build and test AI coding agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`,

  'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: #ededed;
  --background: #0a0a0a;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: 'Inter', sans-serif;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 4px;
}`,

  'src/lib/utils.ts': `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}`,

  'src/lib/api.ts': `const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(\`\${API_BASE}\${endpoint}\`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }

  return res.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) => request<T>(url, { method: 'POST', body }),
  put: <T>(url: string, body: unknown) => request<T>(url, { method: 'PUT', body }),
  patch: <T>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export async function fetchAgents() {
  return api.get<{ id: string; name: string }[]>('/agents');
}

export async function deployAgent(id: string) {
  return api.post<{ status: string }>(\`/agents/\${id}/deploy\`, {});
}`,

  'src/components/Button.tsx': `import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
  ghost: 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
  danger: 'bg-red-600 text-white hover:bg-red-500',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';`,

  'src/components/Header.tsx': `'use client';

import Link from 'next/link';
import { Bot, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Builder', href: '/builder' },
  { label: 'Chat', href: '/chat' },
  { label: 'IDE', href: '/ide' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-white font-semibold">
          <Bot className="w-5 h-5 text-indigo-400" />
          Agent Builder
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className="text-sm text-zinc-400 hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="md:hidden text-zinc-400" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}`,

  'package.json': `{
  "name": "copilot-agent-builder",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "@monaco-editor/react": "^4.7.0",
    "framer-motion": "^12.34.0",
    "lucide-react": "^0.564.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "uuid": "^13.0.0",
    "zustand": "^5.0.11"
  }
}`,

  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,

  'README.md': `# Copilot Agent Builder

Build and test AI-powered coding agents.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.
`,
};

const MOCK_PROBLEMS: ProblemEntry[] = [
  { severity: 'error', message: "'fetchAgents' is defined but never used.", file: 'src/lib/api.ts', line: 35, col: 14 },
  { severity: 'warning', message: "Unexpected any. Specify a different type.", file: 'src/lib/utils.ts', line: 18, col: 32 },
  { severity: 'warning', message: "React Hook useEffect has a missing dependency: 'config'.", file: 'src/app/page.tsx', line: 9, col: 6 },
  { severity: 'info', message: "This expression is not callable. Type 'never' has no call signatures.", file: 'src/components/Button.tsx', line: 44, col: 9 },
];

const AGENT_RESPONSES: string[] = [
  "I've analyzed the current file. Here are a few suggestions:\n\n1. Consider adding error boundaries for better error handling\n2. The component could benefit from `React.memo` to prevent unnecessary re-renders\n3. Extract the inline styles into a shared constants file\n\n```tsx\nexport const Component = React.memo(({ data }) => {\n  // optimized render\n  return <div>{data}</div>;\n});\n```",

  "Looking at this code, I notice a potential performance issue. The function is being recreated on every render. Wrap it with `useCallback`:\n\n```tsx\nconst handleSubmit = useCallback(async (data: FormData) => {\n  await api.post('/submit', data);\n  router.refresh();\n}, [router]);\n```\n\nThis will prevent unnecessary child component re-renders.",

  "The file structure looks solid. A few improvements I'd recommend:\n\n- Add proper TypeScript return types to all functions\n- Consider using Zod for runtime type validation\n- Add JSDoc comments for public API functions\n\n```ts\n/** Formats a date for display in the UI */\nexport function formatDate(date: Date): string {\n  return new Intl.DateTimeFormat('en-US').format(date);\n}\n```",

  "I can help refactor this to use the latest patterns. Here's an improved version using server actions:\n\n```tsx\n'use server';\n\nexport async function submitForm(formData: FormData) {\n  const name = formData.get('name') as string;\n  const email = formData.get('email') as string;\n  \n  await db.insert({ name, email });\n  revalidatePath('/');\n}\n```\n\nThis reduces client-side JavaScript and improves performance.",

  "Good question! For this component, I'd suggest:\n\n1. Use CSS Grid instead of Flexbox for the layout\n2. Add `aria-label` attributes for accessibility\n3. Implement loading states with Suspense boundaries\n\n```tsx\n<Suspense fallback={<Skeleton />}>\n  <DataGrid\n    columns={columns}\n    aria-label=\"Agent configuration grid\"\n  />\n</Suspense>\n```",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectLanguage(ext?: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    md: 'markdown',
    html: 'html',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return map[ext ?? ''] ?? 'plaintext';
}

function getFileIcon(ext?: string) {
  if (!ext) return <File className="w-4 h-4 text-zinc-500" />;
  if (['ts', 'tsx'].includes(ext)) return <FileCode className="w-4 h-4 text-blue-400" />;
  if (['js', 'jsx'].includes(ext)) return <FileCode className="w-4 h-4 text-yellow-400" />;
  if (ext === 'json') return <File className="w-4 h-4 text-yellow-300" />;
  if (ext === 'css') return <File className="w-4 h-4 text-purple-400" />;
  if (ext === 'md') return <File className="w-4 h-4 text-zinc-400" />;
  return <File className="w-4 h-4 text-zinc-500" />;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileTreeItem({
  node,
  depth,
  onFileClick,
  expandedDirs,
  toggleDir,
  activeFilePath,
}: {
  node: FileTreeNode;
  depth: number;
  onFileClick: (node: FileTreeNode) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  activeFilePath: string | null;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isActive = node.path === activeFilePath;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => toggleDir(node.path)}
          className="flex items-center w-full px-2 py-[3px] hover:bg-white/5 text-sm text-zinc-300 transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 mr-1 text-zinc-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1 text-zinc-500 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 mr-1.5 text-indigo-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 mr-1.5 text-indigo-400 flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        <AnimatePresence>
          {isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {node.children.map((child) => (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  onFileClick={onFileClick}
                  expandedDirs={expandedDirs}
                  toggleDir={toggleDir}
                  activeFilePath={activeFilePath}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileClick(node)}
      className={`flex items-center w-full px-2 py-[3px] text-sm transition-colors ${
        isActive
          ? 'bg-indigo-500/15 text-white'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
    >
      {getFileIcon(node.extension)}
      <span className="ml-1.5 truncate">{node.name}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function IDEPage() {
  const { currentAgent } = useAppStore();

  // Layout toggles
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [bottomPanelMaximized, setBottomPanelMaximized] = useState(false);

  // Activity bar
  type ActivityView = 'explorer' | 'search' | 'git' | 'extensions' | 'agent';
  const [activeActivity, setActiveActivity] = useState<ActivityView>('explorer');

  // File explorer
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(['src', 'src/app', 'src/components', 'src/lib'])
  );

  // Editor
  const defaultFile: OpenFile = {
    path: 'src/app/page.tsx',
    name: 'page.tsx',
    language: 'typescript',
    content: MOCK_FILE_CONTENTS['src/app/page.tsx'],
    modified: false,
  };
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([defaultFile]);
  const [activeFilePath, setActiveFilePath] = useState<string>('src/app/page.tsx');

  // Agent panel messages
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: `Hi! I'm **${currentAgent.name}**. I can help you understand and improve the code in this project. Ask me anything about the currently open file or the overall architecture.`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [agentTyping, setAgentTyping] = useState(false);
  const agentMessagesEndRef = useRef<HTMLDivElement>(null);

  // Bottom panel
  type BottomTab = 'terminal' | 'output' | 'problems';
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('terminal');
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '\x1b[32m~/copilot-agent-builder\x1b[0m $ npm run dev',
    '',
    '  > copilot-agent-builder@0.1.0 dev',
    '  > next dev',
    '',
    '  \x1b[32m\u2713\x1b[0m Ready in 1.8s',
    '  - Local:   http://localhost:3000',
    '  - Network: http://192.168.1.42:3000',
    '',
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [outputLines] = useState<string[]>([
    '[09:14:22] Agent initialized successfully',
    '[09:14:22] Loading workspace configuration...',
    '[09:14:23] Found 12 source files in project',
    '[09:14:23] TypeScript compilation: 0 errors, 2 warnings',
    '[09:14:24] ESLint analysis complete: 1 error, 2 warnings',
    '[09:14:24] Agent ready - monitoring file changes',
    '[09:15:01] File changed: src/app/page.tsx',
    '[09:15:01] Re-analyzing dependencies...',
    '[09:15:02] Hot reload triggered',
  ]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const openFile = useCallback(
    (node: FileTreeNode) => {
      if (node.type !== 'file') return;
      const content = MOCK_FILE_CONTENTS[node.path] ?? `// ${node.name}\n// File content not available in mock`;
      const lang = detectLanguage(node.extension);
      setOpenFiles((prev) => {
        const exists = prev.find((f) => f.path === node.path);
        if (exists) return prev;
        return [...prev, { path: node.path, name: node.name, language: lang, content, modified: false }];
      });
      setActiveFilePath(node.path);
    },
    []
  );

  const closeFile = useCallback(
    (path: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setOpenFiles((prev) => {
        const updated = prev.filter((f) => f.path !== path);
        if (activeFilePath === path && updated.length > 0) {
          setActiveFilePath(updated[updated.length - 1].path);
        } else if (updated.length === 0) {
          setActiveFilePath('');
        }
        return updated;
      });
    },
    [activeFilePath]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === activeFilePath ? { ...f, content: value, modified: true } : f))
      );
    },
    [activeFilePath]
  );

  const handleActivityClick = useCallback(
    (view: ActivityView) => {
      if (view === 'agent') {
        setAgentPanelOpen((p) => !p);
        return;
      }
      if (activeActivity === view && sidePanelOpen) {
        setSidePanelOpen(false);
      } else {
        setActiveActivity(view);
        setSidePanelOpen(true);
      }
    },
    [activeActivity, sidePanelOpen]
  );

  // Agent chat
  const sendAgentMessage = useCallback(() => {
    const text = agentInput.trim();
    if (!text) return;

    const userMsg: AgentMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setAgentMessages((prev) => [...prev, userMsg]);
    setAgentInput('');
    setAgentTyping(true);

    setTimeout(() => {
      const currentFile = openFiles.find((f) => f.path === activeFilePath);
      const fileName = currentFile?.name ?? 'your code';
      const randomResponse = AGENT_RESPONSES[Math.floor(Math.random() * AGENT_RESPONSES.length)];
      const response = `Looking at **${fileName}**...\n\n${randomResponse}`;

      const assistantMsg: AgentMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setAgentMessages((prev) => [...prev, assistantMsg]);
      setAgentTyping(false);
    }, 1200 + Math.random() * 800);
  }, [agentInput, openFiles, activeFilePath]);

  // Terminal
  const handleTerminalSubmit = useCallback(() => {
    const cmd = terminalInput.trim();
    if (!cmd) return;
    const newLines = [`\x1b[32m~/copilot-agent-builder\x1b[0m $ ${cmd}`];
    if (cmd === 'clear') {
      setTerminalLines([]);
      setTerminalInput('');
      return;
    }
    if (cmd === 'ls') {
      newLines.push('src/  public/  node_modules/  package.json  tsconfig.json  README.md  next.config.js');
    } else if (cmd === 'git status') {
      newLines.push('On branch main');
      newLines.push('Changes not staged for commit:');
      newLines.push('  modified:   src/app/page.tsx');
      newLines.push('  modified:   src/lib/utils.ts');
    } else if (cmd === 'npm run build') {
      newLines.push('');
      newLines.push('  > copilot-agent-builder@0.1.0 build');
      newLines.push('  > next build');
      newLines.push('');
      newLines.push('  \x1b[32m\u2713\x1b[0m Compiled successfully');
      newLines.push('  \x1b[32m\u2713\x1b[0m Linting and type checking');
      newLines.push('  \x1b[32m\u2713\x1b[0m Collecting page data');
      newLines.push('  \x1b[32m\u2713\x1b[0m Generating static pages');
    } else if (cmd === 'npm test') {
      newLines.push('');
      newLines.push('  PASS  src/__tests__/utils.test.ts');
      newLines.push('  PASS  src/__tests__/api.test.ts');
      newLines.push('  \x1b[32mTests:\x1b[0m  8 passed, 8 total');
      newLines.push('  \x1b[32mTime:\x1b[0m   1.42s');
    } else {
      newLines.push(`bash: ${cmd}: command not found`);
    }
    newLines.push('');
    setTerminalLines((prev) => [...prev, ...newLines]);
    setTerminalInput('');
  }, [terminalInput]);

  // Scroll effects
  useEffect(() => {
    agentMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, agentTyping]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Active file for editor
  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderSidePanel = () => {
    if (activeActivity === 'explorer') {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Explorer</span>
            <button className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {MOCK_FILE_TREE.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                depth={0}
                onFileClick={openFile}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
                activeFilePath={activeFilePath}
              />
            ))}
          </div>
        </div>
      );
    }

    if (activeActivity === 'search') {
      return (
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b border-white/5">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Search</span>
          </div>
          <div className="p-3">
            <div className="flex items-center bg-white/5 rounded-md border border-white/10 px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-zinc-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
              />
            </div>
            {searchQuery && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-zinc-500 px-1">Results in workspace</p>
                {Object.keys(MOCK_FILE_CONTENTS)
                  .filter((p) => MOCK_FILE_CONTENTS[p].toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((p) => (
                    <button
                      key={p}
                      className="flex items-center w-full px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 rounded"
                      onClick={() => {
                        const parts = p.split('/');
                        const name = parts[parts.length - 1];
                        const ext = name.split('.').pop();
                        openFile({ name, path: p, type: 'file', extension: ext });
                      }}
                    >
                      <FileCode className="w-3.5 h-3.5 mr-1.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">{p}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeActivity === 'git') {
      return (
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b border-white/5">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Source Control</span>
          </div>
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <GitBranch className="w-3.5 h-3.5" />
              <span>main</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Changes (2)</p>
              <div className="space-y-0.5">
                <div className="flex items-center px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 rounded">
                  <span className="w-4 text-center text-amber-400 font-bold mr-1.5">M</span>
                  <span className="truncate">src/app/page.tsx</span>
                </div>
                <div className="flex items-center px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 rounded">
                  <span className="w-4 text-center text-amber-400 font-bold mr-1.5">M</span>
                  <span className="truncate">src/lib/utils.ts</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Staged (0)</p>
              <p className="text-xs text-zinc-600 px-2">No staged changes</p>
            </div>
          </div>
        </div>
      );
    }

    if (activeActivity === 'extensions') {
      return (
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b border-white/5">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">Extensions</span>
          </div>
          <div className="p-3 space-y-2">
            {[
              { name: 'GitHub Copilot', desc: 'AI pair programmer', installed: true },
              { name: 'ESLint', desc: 'Linting and formatting', installed: true },
              { name: 'Prettier', desc: 'Code formatter', installed: true },
              { name: 'Tailwind CSS IntelliSense', desc: 'Autocomplete for Tailwind', installed: true },
              { name: 'GitLens', desc: 'Git supercharged', installed: false },
            ].map((ext) => (
              <div key={ext.name} className="flex items-start gap-2.5 p-2 rounded hover:bg-white/5">
                <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Puzzle className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-200 font-medium truncate">{ext.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{ext.desc}</p>
                  <span className={`text-[10px] ${ext.installed ? 'text-green-500' : 'text-zinc-600'}`}>
                    {ext.installed ? 'Installed' : 'Not installed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderMarkdownContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```|\*\*[^*]+\*\*|\`[^`]+\`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const lang = lines[0]?.trim() || '';
        const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
        return (
          <pre
            key={i}
            className="my-2 rounded-md bg-[#0d0e1a] border border-white/5 p-3 overflow-x-auto text-[13px] leading-relaxed text-zinc-300 font-mono"
          >
            {lang && (
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1 block">{lang}</span>
            )}
            <code>{code}</code>
          </pre>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 text-[13px] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      // handle numbered lists and line breaks
      return (
        <span key={i}>
          {part.split('\n').map((line, j) => (
            <span key={j}>
              {line}
              {j < part.split('\n').length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    });
  };

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0b14] text-zinc-200">
      {/* ===== Top title bar ===== */}
      <div className="flex items-center h-9 bg-[#0a0b14] border-b border-white/5 px-4 select-none flex-shrink-0">
        <div className="flex items-center gap-1.5 mr-4">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28ca41]" />
        </div>
        <span className="text-xs text-zinc-500 flex-1 text-center">
          {currentAgent.name} - Agent IDE
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBottomPanelOpen((p) => !p)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Toggle Terminal"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAgentPanelOpen((p) => !p)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Toggle Agent Panel"
          >
            <Bot className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ===== Activity Bar ===== */}
        <div className="flex flex-col items-center w-12 bg-[#0d0e1a] border-r border-white/5 py-2 flex-shrink-0">
          {(
            [
              { id: 'explorer' as ActivityView, icon: Files, label: 'Explorer' },
              { id: 'search' as ActivityView, icon: Search, label: 'Search' },
              { id: 'git' as ActivityView, icon: GitBranch, label: 'Source Control' },
              { id: 'extensions' as ActivityView, icon: Puzzle, label: 'Extensions' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => handleActivityClick(item.id)}
              title={item.label}
              className={`relative flex items-center justify-center w-full h-11 transition-colors ${
                activeActivity === item.id && sidePanelOpen
                  ? 'text-white'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {activeActivity === item.id && sidePanelOpen && (
                <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#6366f1] rounded-r" />
              )}
              <item.icon className="w-5 h-5" />
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={() => handleActivityClick('agent')}
            title="Agent Chat"
            className={`relative flex items-center justify-center w-full h-11 transition-colors ${
              agentPanelOpen ? 'text-indigo-400' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {agentPanelOpen && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#6366f1] rounded-r" />
            )}
            <Bot className="w-5 h-5" />
          </button>
          <button
            title="Settings"
            className="flex items-center justify-center w-full h-11 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* ===== Side Panel ===== */}
        <AnimatePresence>
          {sidePanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="bg-[#12131f] border-r border-white/5 overflow-hidden flex-shrink-0"
            >
              {renderSidePanel()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Main editor + bottom panel column ===== */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Editor area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center bg-[#0a0b14] border-b border-white/5 overflow-x-auto flex-shrink-0">
              {openFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFilePath(file.path)}
                  className={`group flex items-center gap-1.5 px-3 py-[7px] text-sm border-r border-white/5 whitespace-nowrap transition-colors flex-shrink-0 ${
                    file.path === activeFilePath
                      ? 'bg-[#12131f] text-zinc-200 border-b-2 border-b-[#6366f1]'
                      : 'bg-[#0a0b14] text-[#71717a] hover:text-zinc-400'
                  }`}
                >
                  {getFileIcon(file.name.split('.').pop())}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  {file.modified && (
                    <Circle className="w-2 h-2 fill-current text-zinc-400 flex-shrink-0" />
                  )}
                  <span
                    onClick={(e) => closeFile(file.path, e)}
                    className="ml-1 p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              ))}
              <div className="flex-1" />
            </div>

            {/* Monaco Editor or empty state */}
            <div className="flex-1 min-h-0">
              {activeFile ? (
                <MonacoEditor
                  height="100%"
                  language={activeFile.language}
                  theme="vs-dark"
                  value={activeFile.content}
                  onChange={handleEditorChange}
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: true, scale: 1 },
                    scrollBeyondLastLine: false,
                    padding: { top: 16 },
                    lineNumbers: 'on',
                    renderLineHighlight: 'line',
                    bracketPairColorization: { enabled: true },
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-zinc-600">
                  <FileCode className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm">Open a file from the Explorer to start editing</p>
                  <p className="text-xs mt-1 text-zinc-700">Ctrl+P to quick open</p>
                </div>
              )}
            </div>
          </div>

          {/* ===== Bottom Panel ===== */}
          <AnimatePresence>
            {bottomPanelOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: bottomPanelMaximized ? '100%' : 320 }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-[#12131f] border-t border-white/5 flex flex-col overflow-hidden flex-shrink-0"
              >
                {/* Bottom tab bar */}
                <div className="flex items-center bg-[#0a0b14] border-b border-white/5 flex-shrink-0">
                  {(
                    [
                      { id: 'terminal' as BottomTab, icon: Terminal, label: 'Terminal' },
                      { id: 'output' as BottomTab, icon: FileOutput, label: 'Output' },
                      { id: 'problems' as BottomTab, icon: AlertTriangle, label: 'Problems' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveBottomTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeBottomTab === tab.id
                          ? 'text-zinc-200 border-b-2 border-b-[#6366f1]'
                          : 'text-zinc-600 hover:text-zinc-400 border-b-2 border-b-transparent'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {tab.id === 'problems' && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px]">
                          {MOCK_PROBLEMS.length}
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 pr-2">
                    <button
                      onClick={() => setBottomPanelMaximized((p) => !p)}
                      className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      {bottomPanelMaximized ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setBottomPanelOpen(false)}
                      className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom tab content */}
                <div className="flex-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeBottomTab === 'terminal' && (
                      <motion.div
                        key="terminal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="flex flex-col h-full"
                      >
                        {/* Terminal toolbar */}
                        <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5 flex-shrink-0">
                          <span className="text-[11px] text-zinc-500">bash</span>
                          <div className="flex-1" />
                          <button className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors">
                            <Play className="w-3 h-3" />
                          </button>
                          <button className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors">
                            <Square className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setTerminalLines([])}
                            className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed">
                          {terminalLines.map((line, i) => (
                            <div key={i} className="text-zinc-300 whitespace-pre-wrap">
                              {line
                                .replace(/\x1b\[32m/g, '')
                                .replace(/\x1b\[0m/g, '')}
                            </div>
                          ))}
                          <div className="flex items-center">
                            <span className="text-green-400 mr-1">~/copilot-agent-builder $</span>
                            <input
                              type="text"
                              value={terminalInput}
                              onChange={(e) => setTerminalInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTerminalSubmit();
                              }}
                              className="flex-1 bg-transparent text-zinc-200 outline-none font-mono text-[13px]"
                              spellCheck={false}
                              autoComplete="off"
                            />
                          </div>
                          <div ref={terminalEndRef} />
                        </div>
                      </motion.div>
                    )}

                    {activeBottomTab === 'output' && (
                      <motion.div
                        key="output"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="h-full overflow-y-auto p-3 font-mono text-[13px] leading-relaxed"
                      >
                        {outputLines.map((line, i) => (
                          <div key={i} className="text-zinc-400">
                            <span className="text-zinc-600">{line.substring(0, 10)}</span>
                            <span>{line.substring(10)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeBottomTab === 'problems' && (
                      <motion.div
                        key="problems"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="h-full overflow-y-auto"
                      >
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="text-left text-zinc-600 border-b border-white/5 text-xs">
                              <th className="px-3 py-1.5 w-8" />
                              <th className="px-3 py-1.5">Message</th>
                              <th className="px-3 py-1.5 w-48">File</th>
                              <th className="px-3 py-1.5 w-20">Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MOCK_PROBLEMS.map((problem, i) => (
                              <tr
                                key={i}
                                className="border-b border-white/[0.02] hover:bg-white/[0.03] cursor-pointer transition-colors"
                                onClick={() => {
                                  const parts = problem.file.split('/');
                                  const name = parts[parts.length - 1];
                                  const ext = name.split('.').pop();
                                  openFile({ name, path: problem.file, type: 'file', extension: ext });
                                }}
                              >
                                <td className="px-3 py-1.5 text-center">
                                  {problem.severity === 'error' && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 inline" />
                                  )}
                                  {problem.severity === 'warning' && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 inline" />
                                  )}
                                  {problem.severity === 'info' && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-blue-400 inline" />
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-zinc-300">{problem.message}</td>
                                <td className="px-3 py-1.5 text-zinc-500 truncate max-w-[192px]">
                                  {problem.file}
                                </td>
                                <td className="px-3 py-1.5 text-zinc-600">
                                  [{problem.line}, {problem.col}]
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== Agent Panel (right) ===== */}
        <AnimatePresence>
          {agentPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="bg-[#12131f] border-l border-white/5 flex flex-col overflow-hidden flex-shrink-0"
            >
              {/* Agent header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">Copilot Agent</p>
                  <p className="text-[11px] text-zinc-600 truncate">{currentAgent.name}</p>
                </div>
                <button className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors">
                  <Wrench className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAgentPanelOpen(false)}
                  className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Agent messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {agentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white/5 text-zinc-300 rounded-bl-sm border border-white/5'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="space-y-1">{renderMarkdownContent(msg.content)}</div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {agentTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 rounded-xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={agentMessagesEndRef} />
              </div>

              {/* Agent input */}
              <div className="p-3 border-t border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
                  <input
                    type="text"
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendAgentMessage();
                      }
                    }}
                    placeholder="Ask the agent about your code..."
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
                    disabled={agentTyping}
                  />
                  <button
                    onClick={sendAgentMessage}
                    disabled={agentTyping || !agentInput.trim()}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-30 disabled:hover:text-zinc-500 disabled:hover:bg-transparent transition-all"
                  >
                    {agentTyping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-700 mt-1.5 px-1">
                  Agent analyzes the active file and project context
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Status Bar ===== */}
      <div className="flex items-center h-6 bg-[#0d0e1a] border-t border-white/5 px-3 text-[11px] select-none flex-shrink-0">
        <div className="flex items-center gap-3 text-zinc-600">
          <span className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            main
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            {MOCK_PROBLEMS.filter((p) => p.severity === 'warning').length}
            <X className="w-3 h-3 text-red-500 ml-0.5" />
            {MOCK_PROBLEMS.filter((p) => p.severity === 'error').length}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-zinc-600">
          {activeFile && (
            <>
              <span>{activeFile.language === 'typescript' ? 'TypeScript React' : activeFile.language}</span>
              <span>UTF-8</span>
              <span>LF</span>
              <span>Spaces: 2</span>
            </>
          )}
          <span className="flex items-center gap-1 text-indigo-400">
            <Bot className="w-3 h-3" />
            Copilot
          </span>
        </div>
      </div>
    </div>
  );
}
