'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Blocks, MessageSquare, Code, ArrowRight, Bot, Sparkles, Wrench, Shield } from 'lucide-react';

const features = [
  {
    icon: Blocks,
    title: 'Drag & Drop Builder',
    description: 'Visually compose your agent by dragging tools, prompts, skills, and instructions onto the canvas.',
    color: '#6366f1',
    href: '/builder',
  },
  {
    icon: MessageSquare,
    title: 'Agent Chat',
    description: 'Test your agent in real-time with file system access, terminal integration, and tool execution.',
    color: '#06b6d4',
    href: '/chat',
  },
  {
    icon: Code,
    title: 'Agent IDE',
    description: 'Load your agent into a full VS Code editor to test its coding skills and pair programming abilities.',
    color: '#34d399',
    href: '/ide',
  },
];

const stats = [
  { label: 'Tools Available', value: '30+' },
  { label: 'Skill Templates', value: '20+' },
  { label: 'Prompt Templates', value: '15+' },
  { label: 'Model Options', value: '6+' },
];

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center overflow-auto pl-16">
      <div className="mx-auto max-w-5xl px-8 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2d2f4a] bg-[#12131f] px-4 py-1.5 text-sm text-[#a1a1aa]">
            <Sparkles size={14} className="text-[#6366f1]" />
            GitHub Copilot SDK Agent Builder
          </div>

          <h1 className="mb-4 text-5xl font-bold tracking-tight">
            <span className="gradient-text">Build Copilot Agents</span>
            <br />
            <span className="text-[#e4e4e7]">Without Writing Code</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-[#a1a1aa]">
            Create powerful GitHub Copilot extensions with a visual drag-and-drop
            builder. Combine tools, prompts, skills, and instructions to craft
            custom AI agents — then test them instantly.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 rounded-xl bg-[#6366f1] px-6 py-3 font-medium text-white transition-all hover:bg-[#818cf8] hover:shadow-lg hover:shadow-[#6366f1]/25"
            >
              <Blocks size={18} />
              Start Building
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl border border-[#2d2f4a] bg-[#12131f] px-6 py-3 font-medium text-[#e4e4e7] transition-all hover:border-[#6366f1]/50 hover:bg-[#181a2a]"
            >
              <MessageSquare size={18} />
              Try Chat
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 grid grid-cols-4 gap-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[#1e2035] bg-[#12131f] px-4 py-5 text-center"
            >
              <div className="text-2xl font-bold text-[#6366f1]">{stat.value}</div>
              <div className="mt-1 text-xs text-[#71717a]">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 grid grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-xl border border-[#1e2035] bg-[#12131f] p-6 transition-all hover:border-[#2d2f4a] hover:bg-[#181a2a]"
            >
              <div
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${feature.color}20` }}
              >
                <feature.icon size={20} style={{ color: feature.color }} />
              </div>
              <h3 className="mb-2 font-semibold text-[#e4e4e7]">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-[#71717a]">
                {feature.description}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm text-[#6366f1] opacity-0 transition-opacity group-hover:opacity-100">
                Open <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 flex items-center justify-center gap-6 text-xs text-[#71717a]"
        >
          <span className="flex items-center gap-1.5">
            <Bot size={12} /> Copilot Extensions SDK
          </span>
          <span className="flex items-center gap-1.5">
            <Wrench size={12} /> 80+ Toolbox Items
          </span>
          <span className="flex items-center gap-1.5">
            <Shield size={12} /> Built-in Guardrails
          </span>
        </motion.div>
      </div>
    </div>
  );
}
