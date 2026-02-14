'use client';

import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Bot,
  Wrench,
  MessageSquare,
  Sparkles,
  BookOpen,
  Cpu,
  Shield,
  GripVertical,
  X,
  Settings,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';

// ---------------------------------------------------------------------------
// Icon mapping: resolve a string icon name to its Lucide component
// ---------------------------------------------------------------------------
const iconMap: Record<string, React.ComponentType<any>> = {
  Bot,
  Wrench,
  MessageSquare,
  Sparkles,
  BookOpen,
  Cpu,
  Shield,
  // Add defaults for each category
};

const getIcon = (iconName: string) => iconMap[iconName] || Sparkles;

// ---------------------------------------------------------------------------
// Category badge colours
// ---------------------------------------------------------------------------
const categoryBadgeColors: Record<string, string> = {
  agent: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  tool: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  prompt: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  skill: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  instruction: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  model: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  guardrail: 'bg-red-500/20 text-red-300 border-red-500/30',
};

// ---------------------------------------------------------------------------
// Handle shared styles
// ---------------------------------------------------------------------------
const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: '#6366f1',
  border: '2px solid #1e2035',
};

// ---------------------------------------------------------------------------
// CanvasNode component
// ---------------------------------------------------------------------------
export function CanvasNode(props: NodeProps) {
  const { id, data, selected, type } = props;
  const removeNode = useAppStore((s) => s.removeNode);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);

  const {
    label = 'Untitled',
    category = 'tool',
    description = '',
    icon = 'Sparkles',
    color = '#6366f1',
    config,
  } = data as {
    label: string;
    category: string;
    description: string;
    icon: string;
    color: string;
    config: Record<string, unknown>;
  };

  const isAgent = type === 'agent' || category === 'agent';
  const IconComponent = getIcon(icon);

  // ---- Handlers -----------------------------------------------------------
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeNode(id);
    },
    [id, removeNode],
  );

  const handleSettings = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedNode(id);
    },
    [id, setSelectedNode],
  );

  // ---- Derived styles -----------------------------------------------------
  const minWidth = isAgent ? 240 : 200;

  const borderGlow = selected
    ? '0 0 0 2px #6366f1, 0 0 16px 2px rgba(99,102,241,0.35)'
    : '0 2px 8px 0 rgba(0,0,0,0.25)';

  const gradientBorder = isAgent
    ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-[1.5px] rounded-xl'
    : '';

  const badgeColor =
    categoryBadgeColors[category] ||
    'bg-gray-500/20 text-gray-300 border-gray-500/30';

  // ---- Render -------------------------------------------------------------
  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      className={isAgent ? gradientBorder : ''}
      style={{ minWidth }}
    >
      <div
        className={`
          relative flex flex-col bg-[#12131f] border border-[#1e2035] rounded-xl
          overflow-hidden transition-shadow duration-200
        `}
        style={{ boxShadow: borderGlow }}
      >
        {/* Coloured left accent strip */}
        <div
          className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ backgroundColor: color }}
        />

        {/* ---- Header ------------------------------------------------------ */}
        <div className="flex items-start gap-2 px-3 pt-3 pb-1">
          {/* Drag grip */}
          <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-600 cursor-grab" />

          {/* Icon */}
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}25` }}
          >
            <IconComponent
              className="h-4 w-4"
              style={{ color }}
            />
          </div>

          {/* Title */}
          <span className="flex-1 truncate text-sm font-semibold text-gray-100 leading-7">
            {label}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleSettings}
              className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
              title="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Remove node"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ---- Description ------------------------------------------------- */}
        {description && (
          <p className="px-3 pl-[3.25rem] text-[11px] leading-[1.35] text-gray-400 line-clamp-2">
            {description}
          </p>
        )}

        {/* ---- Category badge ---------------------------------------------- */}
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-2.5 pl-[3.25rem]">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-[1px] text-[10px] font-medium capitalize ${badgeColor}`}
          >
            {category}
          </span>
        </div>

        {/* ---- Handles ----------------------------------------------------- */}

        {/* Left input handle (all nodes) */}
        <Handle
          type="target"
          position={Position.Left}
          id="input-left"
          style={{ ...handleStyle, left: -5 }}
        />

        {/* Right output handle (all nodes) */}
        <Handle
          type="source"
          position={Position.Right}
          id="output-right"
          style={{ ...handleStyle, right: -5 }}
        />

        {/* Agent nodes get handles on all four sides */}
        {isAgent && (
          <>
            <Handle
              type="target"
              position={Position.Top}
              id="input-top"
              style={{ ...handleStyle, top: -5 }}
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="output-bottom"
              style={{ ...handleStyle, bottom: -5 }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Node type registry for React Flow
// ---------------------------------------------------------------------------
export const nodeTypes = {
  agent: CanvasNode,
  tool: CanvasNode,
  prompt: CanvasNode,
  skill: CanvasNode,
  instruction: CanvasNode,
  model: CanvasNode,
  guardrail: CanvasNode,
};
