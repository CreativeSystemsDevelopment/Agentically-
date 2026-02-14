'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Blocks, MessageSquare, Code, Settings, Plus, Save, FolderOpen } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/builder', label: 'Agent Builder', icon: <Blocks size={20} /> },
  { href: '/chat', label: 'Agent Chat', icon: <MessageSquare size={20} /> },
  { href: '/ide', label: 'Agent IDE', icon: <Code size={20} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const newAgent = useAppStore((state) => state.newAgent);
  const saveAgent = useAppStore((state) => state.saveAgent);

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center justify-between border-r py-4"
      style={{
        backgroundColor: '#0d0e1a',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/"
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        >
          <Bot size={22} className="text-white" />
          <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            Copilot Agent Builder
          </span>
        </Link>

        {/* Divider */}
        <div className="h-px w-8 bg-white/10" />

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#6366f1' : '#6b7280',
                  boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.25)' : 'none',
                  borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
                    e.currentTarget.style.color = '#a5b4fc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                {item.icon}
                <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-1">
        {/* Save Agent */}
        <button
          onClick={saveAgent}
          className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-white/5 hover:text-emerald-400"
        >
          <Save size={20} />
          <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            Save Agent
          </span>
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-all duration-200 hover:bg-white/5 hover:text-gray-300"
        >
          <Settings size={20} />
          <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            Settings
          </span>
        </Link>

        {/* Divider */}
        <div className="my-1 h-px w-8 bg-white/10" />

        {/* New Agent */}
        <button
          onClick={newAgent}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        >
          <Plus size={20} className="text-white" />
          <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            New Agent
          </span>
        </button>
      </div>
    </aside>
  );
}
