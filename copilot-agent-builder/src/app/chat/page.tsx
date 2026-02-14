'use client';

import { useAppStore } from '@/lib/store';
import { ChatMessage } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Terminal,
  FolderOpen,
  File,
  Folder,
  FileCode,
  FileText,
  RefreshCw,
  Trash2,
  Download,
  Paperclip,
  ChevronRight,
  ChevronDown,
  Loader2,
  Wrench,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useState, useRef, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system';
  content: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_FILE_TREE: FileTreeNode[] = [
  {
    name: 'src',
    type: 'directory',
    children: [
      {
        name: 'components',
        type: 'directory',
        children: [
          { name: 'Button.tsx', type: 'file' },
          { name: 'Header.tsx', type: 'file' },
        ],
      },
      {
        name: 'lib',
        type: 'directory',
        children: [
          { name: 'utils.ts', type: 'file' },
          { name: 'api.ts', type: 'file' },
        ],
      },
      {
        name: 'app',
        type: 'directory',
        children: [
          { name: 'page.tsx', type: 'file' },
          { name: 'layout.tsx', type: 'file' },
        ],
      },
    ],
  },
  { name: 'package.json', type: 'file' },
  { name: 'tsconfig.json', type: 'file' },
  { name: 'README.md', type: 'file' },
];

const SIMULATED_RESPONSES = [
  {
    content:
      "I've analyzed the project structure and found the relevant files. Let me read the contents and suggest improvements.",
    toolCalls: [
      {
        id: uuidv4(),
        name: 'read_file',
        arguments: '{"path": "src/components/Button.tsx"}',
        result:
          'export default function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {\n  return (\n    <button\n      onClick={onClick}\n      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"\n    >\n      {children}\n    </button>\n  );\n}',
      },
    ],
  },
  {
    content:
      "I ran the tests and everything is passing. Here's a summary of the test results and the changes I'll make next.",
    toolCalls: [
      {
        id: uuidv4(),
        name: 'run_terminal',
        arguments: '{"command": "npm test -- --coverage"}',
        result:
          'PASS  src/__tests__/Button.test.tsx\nPASS  src/__tests__/Header.test.tsx\n\nTest Suites:  2 passed, 2 total\nTests:        8 passed, 8 total\nCoverage:     94.2%',
      },
    ],
  },
  {
    content:
      "I've updated the utility functions to improve type safety. The changes have been applied to the workspace.",
    toolCalls: [
      {
        id: uuidv4(),
        name: 'edit_file',
        arguments: '{"path": "src/lib/utils.ts", "operation": "update"}',
        result:
          'Successfully updated src/lib/utils.ts\n+ Added type guards for API response handling\n+ Improved error boundary utility\n  3 insertions, 1 deletion',
      },
    ],
  },
  {
    content:
      "The API module has been refactored. I've added proper error handling and request caching. Let me verify everything compiles correctly.",
    toolCalls: [
      {
        id: uuidv4(),
        name: 'run_terminal',
        arguments: '{"command": "npx tsc --noEmit"}',
        result: 'Compilation successful. No errors found.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <FileCode size={15} className="text-blue-400 shrink-0" />;
    case 'json':
      return <FileText size={15} className="text-yellow-400 shrink-0" />;
    case 'md':
      return <FileText size={15} className="text-gray-400 shrink-0" />;
    case 'png':
    case 'jpg':
    case 'svg':
      return <File size={15} className="text-pink-400 shrink-0" />;
    default:
      return <File size={15} className="text-gray-500 shrink-0" />;
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// FileTreeItem component
// ---------------------------------------------------------------------------

function FileTreeItem({
  node,
  depth,
  onFileClick,
}: {
  node: FileTreeNode;
  depth: number;
  onFileClick: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md hover:bg-white/5 transition-colors group"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown size={14} className="text-gray-500 shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-gray-500 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen size={15} className="text-indigo-400 shrink-0" />
          ) : (
            <Folder size={15} className="text-indigo-400 shrink-0" />
          )}
          <span className="text-sm text-gray-300 truncate group-hover:text-white transition-colors">
            {node.name}
          </span>
        </button>
        <AnimatePresence>
          {expanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {node.children.map((child) => (
                <FileTreeItem
                  key={child.name}
                  node={child}
                  depth={depth + 1}
                  onFileClick={onFileClick}
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
      onClick={() => onFileClick(node.name)}
      className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md hover:bg-white/5 transition-colors group"
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
    >
      {getFileIcon(node.name)}
      <span className="text-sm text-gray-400 truncate group-hover:text-gray-200 transition-colors">
        {node.name}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ToolCallBlock component
// ---------------------------------------------------------------------------

function ToolCallBlock({ toolCall }: { toolCall: { id: string; name: string; arguments: string; result?: string } }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 rounded-lg border border-[#2d2f4a] bg-[#0a0b14] overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <Wrench size={13} className="text-indigo-400 shrink-0" />
        <span className="text-xs font-medium text-indigo-300">{toolCall.name}</span>
        <span className="text-xs text-gray-500 ml-auto font-mono truncate max-w-[180px]">
          {toolCall.arguments}
        </span>
        {expanded ? (
          <ChevronDown size={13} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-gray-500 shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {expanded && toolCall.result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <pre className="px-3 py-2 text-xs font-mono text-emerald-300 bg-[#0a0b0e] border-t border-[#1e2035] whitespace-pre-wrap leading-relaxed">
              {toolCall.result}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TypingIndicator component
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-indigo-400" />
      </div>
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#12131f] border border-[#1e2035]">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ChatPage() {
  // Store ------------------------------------------------------------------
  const {
    currentAgent,
    chatMessages,
    chatLoading,
    addChatMessage,
    setChatLoading,
    clearChat,
  } = useAppStore();

  // Local state ------------------------------------------------------------
  const [inputValue, setInputValue] = useState('');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { id: uuidv4(), type: 'system', content: 'Agent terminal ready. Connected to workspace.' },
    { id: uuidv4(), type: 'output', content: '' },
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalMaximized, setTerminalMaximized] = useState(true);
  const [responseIndex, setResponseIndex] = useState(0);

  // Refs -------------------------------------------------------------------
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat -------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Auto-scroll terminal ---------------------------------------------------
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Auto-resize textarea ---------------------------------------------------
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  // Handlers ---------------------------------------------------------------

  const handleSendMessage = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || chatLoading) return;

    // User message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    setInputValue('');
    setChatLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Simulate assistant response
    const simulated = SIMULATED_RESPONSES[responseIndex % SIMULATED_RESPONSES.length];
    setResponseIndex((prev) => prev + 1);

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: simulated.content,
        timestamp: new Date().toISOString(),
        toolCalls: simulated.toolCalls.map((tc) => ({ ...tc, id: uuidv4() })),
      };
      addChatMessage(assistantMsg);
      setChatLoading(false);
    }, 1500);
  }, [inputValue, chatLoading, addChatMessage, setChatLoading, responseIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const handleTerminalSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cmd = terminalInput.trim();
      if (!cmd) return;

      const inputLine: TerminalLine = { id: uuidv4(), type: 'input', content: `$ ${cmd}` };
      let outputContent = `Executing: ${cmd}...`;

      switch (cmd.toLowerCase()) {
        case 'ls':
          outputContent =
            'src/\npackage.json\ntsconfig.json\nREADME.md\nnode_modules/\n.gitignore';
          break;
        case 'pwd':
          outputContent = '/workspace/project';
          break;
        case 'node --version':
          outputContent = 'v20.11.0';
          break;
        case 'npm --version':
          outputContent = '10.2.4';
          break;
        case 'clear':
          setTerminalLines([
            { id: uuidv4(), type: 'system', content: 'Terminal cleared.' },
          ]);
          setTerminalInput('');
          return;
        case 'help':
          outputContent =
            'Available mock commands: ls, pwd, node --version, npm --version, clear, help';
          break;
      }

      const outputLine: TerminalLine = { id: uuidv4(), type: 'output', content: outputContent };
      setTerminalLines((prev) => [...prev, inputLine, outputLine]);
      setTerminalInput('');
    },
    [terminalInput],
  );

  const handleFileClick = useCallback(
    (name: string) => {
      const systemMsg: ChatMessage = {
        id: uuidv4(),
        role: 'system',
        content: `Opened file: ${name}`,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(systemMsg);
    },
    [addChatMessage],
  );

  const handleExportChat = useCallback(() => {
    const text = chatMessages
      .map(
        (m) =>
          `[${formatTime(m.timestamp)}] ${m.role.toUpperCase()}: ${m.content}${
            m.toolCalls?.length
              ? '\n' +
                m.toolCalls
                  .map(
                    (tc) =>
                      `  [Tool: ${tc.name}] ${tc.arguments}${tc.result ? `\n  Result: ${tc.result}` : ''}`,
                  )
                  .join('\n')
              : ''
          }`,
      )
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAgent.name.replace(/\s+/g, '-').toLowerCase()}-chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chatMessages, currentAgent.name]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-[#0a0b14] text-gray-100 overflow-hidden">
      {/* ===== Top Header Bar ===== */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#12131f] border-b border-[#1e2035] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Bot size={18} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white leading-tight">
                {currentAgent.name}
              </h1>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Online
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate max-w-[340px]">
              {currentAgent.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChat}
            disabled={chatMessages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#2d2f4a] text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            Export Chat
          </button>
          <button
            onClick={clearChat}
            disabled={chatMessages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#2d2f4a] text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={13} />
            Clear Chat
          </button>
        </div>
      </header>

      {/* ===== Three Column Layout ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ----- File Browser (left) ----- */}
        <aside className="w-[280px] shrink-0 bg-[#12131f] border-r border-[#1e2035] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2035]">
            <div className="flex items-center gap-2">
              <FolderOpen size={15} className="text-indigo-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                File Explorer
              </span>
            </div>
            <button
              className="p-1 rounded hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-300"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-1 scrollbar-thin scrollbar-thumb-[#1e2035]">
            {MOCK_FILE_TREE.map((node) => (
              <FileTreeItem key={node.name} node={node} depth={0} onFileClick={handleFileClick} />
            ))}
          </div>

          <div className="px-4 py-2 border-t border-[#1e2035]">
            <p className="text-[10px] text-gray-600">
              {MOCK_FILE_TREE.length} root items
            </p>
          </div>
        </aside>

        {/* ----- Chat Area (center) ----- */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin scrollbar-thumb-[#1e2035]">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                  <Bot size={28} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-300">
                    Start a conversation
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    Chat with <span className="text-indigo-400 font-medium">{currentAgent.name}</span> to
                    test your agent. It has access to the file system and terminal.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Analyze the project structure', 'Run the test suite', 'Refactor utils.ts'].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInputValue(suggestion)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-[#2d2f4a] text-gray-400 hover:text-white hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={`flex gap-3 py-2 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Avatar (left side for assistant/system) */}
                  {msg.role !== 'user' && (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.role === 'assistant'
                          ? 'bg-indigo-500/20'
                          : 'bg-gray-500/20'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <Bot size={14} className="text-indigo-400" />
                      ) : (
                        <Terminal size={14} className="text-gray-400" />
                      )}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`max-w-[70%] min-w-[80px] ${
                      msg.role === 'user'
                        ? 'bg-[#6366f1]/20 border border-[#6366f1]/30 rounded-2xl rounded-br-md'
                        : msg.role === 'assistant'
                          ? 'bg-[#12131f] border border-[#1e2035] rounded-2xl rounded-bl-md'
                          : 'bg-[#181a2a] border border-[#1e2035] rounded-xl'
                    } px-4 py-2.5`}
                  >
                    {/* Role label */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          msg.role === 'user'
                            ? 'text-indigo-300'
                            : msg.role === 'assistant'
                              ? 'text-indigo-400'
                              : 'text-gray-500'
                        }`}
                      >
                        {msg.role === 'user'
                          ? 'You'
                          : msg.role === 'assistant'
                            ? currentAgent.name
                            : 'System'}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>

                    {/* Tool calls */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.toolCalls.map((tc) => (
                          <ToolCallBlock key={tc.id} toolCall={tc} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Avatar (right side for user) */}
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} className="text-indigo-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {chatLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TypingIndicator />
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-[#1e2035] bg-[#12131f] px-4 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-[#2d2f4a] bg-[#181a2a] px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
              <button
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors shrink-0 mb-0.5"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${currentAgent.name}...`}
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none outline-none max-h-[160px] leading-relaxed py-1"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || chatLoading}
                className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-0.5"
              >
                {chatLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5 text-center">
              Press Enter to send, Shift+Enter for a new line
            </p>
          </div>
        </main>

        {/* ----- Terminal Panel (right) ----- */}
        <aside
          className={`${
            terminalMaximized ? 'w-[380px]' : 'w-[380px]'
          } shrink-0 bg-[#0a0b0e] border-l border-[#1e2035] flex flex-col overflow-hidden`}
        >
          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#12131f] border-b border-[#1e2035]">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-emerald-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Terminal
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Window control dots */}
              <button
                onClick={() => setTerminalMaximized((p) => !p)}
                title={terminalMaximized ? 'Minimize' : 'Maximize'}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-white/5 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 hover:bg-emerald-400 transition-colors" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70 hover:bg-yellow-400 transition-colors" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70 hover:bg-red-400 transition-colors" />
              </button>
            </div>
          </div>

          {/* Terminal output area */}
          <div
            className={`flex-1 overflow-y-auto px-4 py-3 font-mono text-xs scrollbar-thin scrollbar-thumb-[#1e2035] ${
              terminalMaximized ? '' : 'hidden'
            }`}
            onClick={() => terminalInputRef.current?.focus()}
          >
            {terminalLines.map((line) => (
              <div
                key={line.id}
                className={`leading-relaxed whitespace-pre-wrap ${
                  line.type === 'system'
                    ? 'text-gray-500 italic'
                    : line.type === 'input'
                      ? 'text-emerald-300'
                      : 'text-gray-400'
                } ${line.content === '' ? 'h-3' : ''}`}
              >
                {line.content}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Terminal input */}
          {terminalMaximized && (
            <form
              onSubmit={handleTerminalSubmit}
              className="shrink-0 flex items-center gap-1 px-4 py-2 border-t border-[#1e2035] bg-[#0a0b0e]"
            >
              <span className="text-emerald-400 font-mono text-xs shrink-0">$</span>
              <input
                ref={terminalInputRef}
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-xs font-mono text-emerald-300 placeholder-gray-600 outline-none"
              />
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
