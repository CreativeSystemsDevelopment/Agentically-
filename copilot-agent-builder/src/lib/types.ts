export type NodeCategory = 'tool' | 'prompt' | 'skill' | 'instruction' | 'model' | 'guardrail';

export interface ToolboxItem {
  id: string;
  name: string;
  category: NodeCategory;
  description: string;
  icon: string;
  color: string;
  config: Record<string, unknown>;
  tags: string[];
  source?: string;
}

export interface AgentNode {
  id: string;
  type: 'agent' | 'tool' | 'prompt' | 'skill' | 'instruction' | 'model' | 'guardrail';
  position: { x: number; y: number };
  data: {
    label: string;
    category: NodeCategory | 'agent';
    description: string;
    icon: string;
    color: string;
    config: Record<string, unknown>;
    toolboxItemId?: string;
  };
}

export interface AgentEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  nodes: AgentNode[];
  edges: AgentEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
}
