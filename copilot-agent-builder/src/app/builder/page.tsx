'use client';

import React, { useCallback, useMemo, useState, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Connection,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes } from '@/components/CanvasNode';
import { useAppStore } from '@/lib/store';
import { toolboxItems } from '@/lib/toolbox-data';
import { ToolboxItem } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Save,
  Download,
  Rocket,
  GripVertical,
  ChevronDown,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { key: 'all', label: 'All', color: '#6366f1' },
  { key: 'tool', label: 'Tools', color: '#06b6d4' },
  { key: 'prompt', label: 'Prompts', color: '#f472b6' },
  { key: 'skill', label: 'Skills', color: '#34d399' },
  { key: 'instruction', label: 'Instructions', color: '#fbbf24' },
  { key: 'model', label: 'Models', color: '#818cf8' },
  { key: 'guardrail', label: 'Guardrails', color: '#ef4444' },
] as const;

const categoryColorMap: Record<string, string> = {
  tool: '#06b6d4',
  prompt: '#f472b6',
  skill: '#34d399',
  instruction: '#fbbf24',
  model: '#818cf8',
  guardrail: '#ef4444',
};

// ---------------------------------------------------------------------------
// Toolbox Sidebar
// ---------------------------------------------------------------------------
function ToolboxSidebar() {
  const toolboxSearchQuery = useAppStore((s) => s.toolboxSearchQuery);
  const toolboxCategory = useAppStore((s) => s.toolboxCategory);
  const setToolboxSearch = useAppStore((s) => s.setToolboxSearch);
  const setToolboxCategory = useAppStore((s) => s.setToolboxCategory);

  const filteredItems = useMemo(() => {
    let items = toolboxItems;

    if (toolboxCategory !== 'all') {
      items = items.filter((item) => item.category === toolboxCategory);
    }

    if (toolboxSearchQuery.trim()) {
      const q = toolboxSearchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return items;
  }, [toolboxCategory, toolboxSearchQuery]);

  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, item: ToolboxItem) => {
      e.dataTransfer.setData('application/copilot-builder-item', item.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  return (
    <div className="flex w-[320px] flex-shrink-0 flex-col border-r border-[#1e2035] bg-[#0a0b14]">
      {/* Header */}
      <div className="border-b border-[#1e2035] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#e4e4e7]">Toolbox</h2>
        <p className="mt-0.5 text-xs text-[#71717a]">
          Drag components onto the canvas
        </p>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            placeholder="Search components..."
            value={toolboxSearchQuery}
            onChange={(e) => setToolboxSearch(e.target.value)}
            className="w-full rounded-lg border border-[#2d2f4a] bg-[#0a0b14] py-2 pl-9 pr-3 text-sm text-[#e4e4e7] placeholder-[#71717a] focus:border-[#6366f1] focus:outline-none"
          />
          {toolboxSearchQuery && (
            <button
              onClick={() => setToolboxSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#71717a] hover:text-[#e4e4e7]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 px-3 py-3">
        {CATEGORIES.map((cat) => {
          const isActive = toolboxCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setToolboxCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'border-[#6366f1]/40 bg-[#6366f1]/15 text-[#e4e4e7]'
                  : 'border-[#2d2f4a] bg-[#12131f] text-[#a1a1aa] hover:border-[#6366f1]/30 hover:text-[#e4e4e7]'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-1.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onDragStart(e, item)}
              className="group flex cursor-grab items-start gap-2.5 rounded-lg border border-[#1e2035] bg-[#12131f] p-2.5 transition-all hover:border-[#2d2f4a] hover:bg-[#181a2a] active:cursor-grabbing"
            >
              <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#71717a] opacity-0 transition-opacity group-hover:opacity-100" />
              <div
                className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <div
                  className="h-3.5 w-3.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-[#e4e4e7]">
                    {item.name}
                  </span>
                  <span
                    className="inline-flex flex-shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-medium capitalize"
                    style={{
                      color: categoryColorMap[item.category] || '#a1a1aa',
                      borderColor: `${categoryColorMap[item.category] || '#a1a1aa'}40`,
                      backgroundColor: `${categoryColorMap[item.category] || '#a1a1aa'}15`,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.4] text-[#71717a]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Search className="mb-2 h-8 w-8 text-[#2d2f4a]" />
              <p className="text-sm text-[#71717a]">No components found</p>
              <p className="mt-1 text-xs text-[#71717a]/60">
                Try a different search or category
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Properties Panel
// ---------------------------------------------------------------------------
function PropertiesPanel() {
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const nodes = useAppStore((s) => s.currentAgent.nodes);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const removeNode = useAppStore((s) => s.removeNode);
  const updateNodeConfig = useAppStore((s) => s.updateNodeConfig);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');

  // Sync local state when selected node changes
  React.useEffect(() => {
    if (selectedNode) {
      setLocalName(selectedNode.data.label);
      setLocalDescription(selectedNode.data.description);
    }
  }, [selectedNode]);

  const handleNameBlur = useCallback(() => {
    if (selectedNodeId && localName.trim()) {
      updateNodeConfig(selectedNodeId, { label: localName });
    }
  }, [selectedNodeId, localName, updateNodeConfig]);

  const handleDescriptionBlur = useCallback(() => {
    if (selectedNodeId) {
      updateNodeConfig(selectedNodeId, { description: localDescription });
    }
  }, [selectedNodeId, localDescription, updateNodeConfig]);

  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      removeNode(selectedNodeId);
      setSelectedNode(null);
    }
  }, [selectedNodeId, removeNode, setSelectedNode]);

  if (!selectedNode) return null;

  const configEntries = Object.entries(selectedNode.data.config || {});
  const nodeColor = categoryColorMap[selectedNode.data.category] || '#6366f1';

  return (
    <AnimatePresence>
      {selectedNodeId && (
        <motion.div
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex w-[380px] flex-shrink-0 flex-col border-l border-[#1e2035] bg-[#0a0b14]"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[#1e2035] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#e4e4e7]">
              Properties
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded p-1 text-[#71717a] transition-colors hover:bg-[#181a2a] hover:text-[#e4e4e7]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Category badge */}
            <div className="mb-4">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize"
                style={{
                  color: nodeColor,
                  borderColor: `${nodeColor}40`,
                  backgroundColor: `${nodeColor}15`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: nodeColor }}
                />
                {selectedNode.data.category}
              </span>
            </div>

            {/* Node name */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-[#a1a1aa]">
                Name
              </label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={handleNameBlur}
                className="w-full rounded-lg border border-[#2d2f4a] bg-[#0a0b14] px-3 py-2 text-sm text-[#e4e4e7] focus:border-[#6366f1] focus:outline-none"
              />
            </div>

            {/* Node description */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-[#a1a1aa]">
                Description
              </label>
              <textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                rows={3}
                className="w-full resize-none rounded-lg border border-[#2d2f4a] bg-[#0a0b14] px-3 py-2 text-sm text-[#e4e4e7] focus:border-[#6366f1] focus:outline-none"
              />
            </div>

            {/* Node ID */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-[#a1a1aa]">
                Node ID
              </label>
              <div className="rounded-lg border border-[#1e2035] bg-[#12131f] px-3 py-2 text-xs font-mono text-[#71717a]">
                {selectedNode.id}
              </div>
            </div>

            {/* Configuration fields */}
            {configEntries.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-xs font-medium text-[#a1a1aa]">
                    Configuration
                  </label>
                  <ChevronDown className="h-3 w-3 text-[#71717a]" />
                </div>
                <div className="space-y-3 rounded-lg border border-[#1e2035] bg-[#12131f] p-3">
                  {configEntries.map(([key, value]) => (
                    <div key={key}>
                      <label className="mb-1 block text-[11px] font-medium capitalize text-[#71717a]">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      {typeof value === 'boolean' ? (
                        <button
                          onClick={() =>
                            updateNodeConfig(selectedNodeId!, {
                              [key]: !value,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            value ? 'bg-[#6366f1]' : 'bg-[#2d2f4a]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                              value ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`}
                          />
                        </button>
                      ) : typeof value === 'number' ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) =>
                            updateNodeConfig(selectedNodeId!, {
                              [key]: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-[#2d2f4a] bg-[#0a0b14] px-3 py-1.5 text-xs text-[#e4e4e7] focus:border-[#6366f1] focus:outline-none"
                        />
                      ) : typeof value === 'string' ? (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            updateNodeConfig(selectedNodeId!, {
                              [key]: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-[#2d2f4a] bg-[#0a0b14] px-3 py-1.5 text-xs text-[#e4e4e7] focus:border-[#6366f1] focus:outline-none"
                        />
                      ) : Array.isArray(value) ? (
                        <div className="rounded border border-[#2d2f4a] bg-[#0a0b14] px-3 py-1.5 text-xs font-mono text-[#71717a]">
                          {JSON.stringify(value)}
                        </div>
                      ) : typeof value === 'object' && value !== null ? (
                        <div className="rounded border border-[#2d2f4a] bg-[#0a0b14] px-3 py-1.5 text-xs font-mono text-[#71717a]">
                          {JSON.stringify(value)}
                        </div>
                      ) : (
                        <div className="rounded border border-[#2d2f4a] bg-[#0a0b14] px-3 py-1.5 text-xs text-[#71717a]">
                          {String(value)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Delete button */}
          <div className="border-t border-[#1e2035] p-4">
            <button
              onClick={handleDelete}
              className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/20"
            >
              Delete Node
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Canvas Header
// ---------------------------------------------------------------------------
function CanvasHeader() {
  const agentName = useAppStore((s) => s.currentAgent.name);
  const agentDescription = useAppStore((s) => s.currentAgent.description);
  const updateAgentName = useAppStore((s) => s.updateAgentName);
  const updateAgentDescription = useAppStore((s) => s.updateAgentDescription);
  const saveAgent = useAppStore((s) => s.saveAgent);
  const currentAgent = useAppStore((s) => s.currentAgent);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(currentAgent, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAgent.name.toLowerCase().replace(/\s+/g, '-')}.agent.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentAgent]);

  return (
    <div className="flex items-center gap-3 border-b border-[#1e2035] bg-[#0a0b14]/80 px-4 py-2 backdrop-blur-sm">
      {/* Agent name */}
      <input
        type="text"
        value={agentName}
        onChange={(e) => updateAgentName(e.target.value)}
        className="min-w-0 max-w-[240px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-[#e4e4e7] transition-colors hover:border-[#2d2f4a] focus:border-[#6366f1] focus:outline-none"
      />

      {/* Separator */}
      <div className="h-4 w-px bg-[#1e2035]" />

      {/* Agent description */}
      <input
        type="text"
        value={agentDescription}
        onChange={(e) => updateAgentDescription(e.target.value)}
        placeholder="Add a description..."
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs text-[#a1a1aa] transition-colors hover:border-[#2d2f4a] focus:border-[#6366f1] focus:outline-none"
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={saveAgent}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d2f4a] bg-[#12131f] px-3 py-1.5 text-xs font-medium text-[#a1a1aa] transition-colors hover:border-[#6366f1]/40 hover:text-[#e4e4e7]"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d2f4a] bg-[#12131f] px-3 py-1.5 text-xs font-medium text-[#a1a1aa] transition-colors hover:border-[#6366f1]/40 hover:text-[#e4e4e7]"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#5558e6]">
          <Rocket className="h-3.5 w-3.5" />
          Deploy
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BuilderCanvas (inner component that uses useReactFlow)
// ---------------------------------------------------------------------------
function BuilderCanvas() {
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useAppStore((s) => s.currentAgent.nodes);
  const edges = useAppStore((s) => s.currentAgent.edges);
  const addEdge = useAppStore((s) => s.addEdge);
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const setSelectedNode = useAppStore((s) => s.setSelectedNode);
  const addNodeFromToolbox = useAppStore((s) => s.addNodeFromToolbox);

  // Convert store nodes/edges to ReactFlow format
  const rfNodes = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        selected: false,
      })),
    [nodes]
  );

  const rfEdges = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type || 'default',
        animated: e.animated ?? true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      })),
    [edges]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const itemId = e.dataTransfer.getData('application/copilot-builder-item');
      if (!itemId) return;

      const item = toolboxItems.find((t) => t.id === itemId);
      if (!item) return;

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      addNodeFromToolbox(item, position);
    },
    [screenToFlowPosition, addNodeFromToolbox]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge({
          id: `e-${uuidv4()}`,
          source: connection.source,
          target: connection.target,
          animated: true,
        });
      }
    },
    [addEdge]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: { id: string; position: { x: number; y: number } }) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="flex flex-1 flex-col bg-[#0a0b14]">
      <CanvasHeader />
      <div className="relative flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          className="bg-[#0a0b14]"
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          }}
        >
          <Background
            gap={20}
            size={1}
            color="#1e2035"
          />
          <Controls
            className="!border-[#1e2035] !bg-[#12131f] [&>button]:!border-[#1e2035] [&>button]:!bg-[#12131f] [&>button]:!fill-[#a1a1aa] [&>button:hover]:!bg-[#181a2a]"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(node) => {
              const color = node.data?.color;
              return typeof color === 'string' ? color : '#6366f1';
            }}
            maskColor="rgba(10, 11, 20, 0.8)"
            className="!border-[#1e2035] !bg-[#12131f]"
          />
        </ReactFlow>

        {/* Drop zone hint overlay (shown when no nodes except default) */}
        {nodes.length <= 1 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border-2 border-dashed border-[#1e2035] px-12 py-8 text-center">
              <p className="text-sm font-medium text-[#71717a]">
                Drag and drop components from the toolbox
              </p>
              <p className="mt-1 text-xs text-[#71717a]/50">
                Connect them to the Agent Core to build your agent
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component (wrapped in ReactFlowProvider)
// ---------------------------------------------------------------------------
export default function BuilderPage() {
  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0a0b14]">
        <ToolboxSidebar />
        <BuilderCanvas />
        <PropertiesPanel />
      </div>
    </ReactFlowProvider>
  );
}
