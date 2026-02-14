import { create } from 'zustand';
import { AgentConfig, AgentNode, AgentEdge, ChatMessage, ToolboxItem } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  // Agent config
  currentAgent: AgentConfig;
  savedAgents: AgentConfig[];

  // Builder state
  selectedNodeId: string | null;
  toolboxSearchQuery: string;
  toolboxCategory: string;

  // Chat state
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  // Actions
  setCurrentAgent: (agent: AgentConfig) => void;
  updateAgentName: (name: string) => void;
  updateAgentDescription: (desc: string) => void;
  updateSystemPrompt: (prompt: string) => void;
  addNode: (node: AgentNode) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;
  addEdge: (edge: AgentEdge) => void;
  removeEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setToolboxSearch: (query: string) => void;
  setToolboxCategory: (category: string) => void;
  saveAgent: () => void;
  loadAgent: (id: string) => void;
  deleteAgent: (id: string) => void;
  newAgent: () => void;

  // Chat actions
  addChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;
  clearChat: () => void;

  // Drop handler
  addNodeFromToolbox: (item: ToolboxItem, position: { x: number; y: number }) => void;
}

const createEmptyAgent = (): AgentConfig => ({
  id: uuidv4(),
  name: 'New Copilot Agent',
  description: 'A custom GitHub Copilot agent',
  systemPrompt: 'You are a helpful GitHub Copilot agent.',
  nodes: [
    {
      id: 'agent-core',
      type: 'agent',
      position: { x: 400, y: 300 },
      data: {
        label: 'Agent Core',
        category: 'agent',
        description: 'The central agent node - connect tools, prompts, and skills here',
        icon: 'Bot',
        color: '#6366f1',
        config: {},
      },
    },
  ],
  edges: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useAppStore = create<AppState>((set, get) => ({
  currentAgent: createEmptyAgent(),
  savedAgents: [],
  selectedNodeId: null,
  toolboxSearchQuery: '',
  toolboxCategory: 'all',
  chatMessages: [],
  chatLoading: false,

  setCurrentAgent: (agent) => set({ currentAgent: agent }),

  updateAgentName: (name) =>
    set((state) => ({
      currentAgent: { ...state.currentAgent, name, updatedAt: new Date().toISOString() },
    })),

  updateAgentDescription: (description) =>
    set((state) => ({
      currentAgent: { ...state.currentAgent, description, updatedAt: new Date().toISOString() },
    })),

  updateSystemPrompt: (systemPrompt) =>
    set((state) => ({
      currentAgent: { ...state.currentAgent, systemPrompt, updatedAt: new Date().toISOString() },
    })),

  addNode: (node) =>
    set((state) => ({
      currentAgent: {
        ...state.currentAgent,
        nodes: [...state.currentAgent.nodes, node],
        updatedAt: new Date().toISOString(),
      },
    })),

  removeNode: (id) =>
    set((state) => ({
      currentAgent: {
        ...state.currentAgent,
        nodes: state.currentAgent.nodes.filter((n) => n.id !== id),
        edges: state.currentAgent.edges.filter((e) => e.source !== id && e.target !== id),
        updatedAt: new Date().toISOString(),
      },
    })),

  updateNodePosition: (id, position) =>
    set((state) => ({
      currentAgent: {
        ...state.currentAgent,
        nodes: state.currentAgent.nodes.map((n) =>
          n.id === id ? { ...n, position } : n
        ),
      },
    })),

  updateNodeConfig: (id, config) =>
    set((state) => ({
      currentAgent: {
        ...state.currentAgent,
        nodes: state.currentAgent.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  addEdge: (edge) =>
    set((state) => ({
      currentAgent: {
        ...state.currentAgent,
        edges: [...state.currentAgent.edges, edge],
        updatedAt: new Date().toISOString(),
      },
    })),

  removeEdge: (id) =>
    set((state) => ({
      currentAgent: {
        ...state.currentAgent,
        edges: state.currentAgent.edges.filter((e) => e.id !== id),
        updatedAt: new Date().toISOString(),
      },
    })),

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setToolboxSearch: (query) => set({ toolboxSearchQuery: query }),
  setToolboxCategory: (category) => set({ toolboxCategory: category }),

  saveAgent: () =>
    set((state) => {
      const agent = { ...state.currentAgent, updatedAt: new Date().toISOString() };
      const existing = state.savedAgents.findIndex((a) => a.id === agent.id);
      const savedAgents =
        existing >= 0
          ? state.savedAgents.map((a, i) => (i === existing ? agent : a))
          : [...state.savedAgents, agent];
      return { currentAgent: agent, savedAgents };
    }),

  loadAgent: (id) =>
    set((state) => {
      const agent = state.savedAgents.find((a) => a.id === id);
      return agent ? { currentAgent: agent } : {};
    }),

  deleteAgent: (id) =>
    set((state) => ({
      savedAgents: state.savedAgents.filter((a) => a.id !== id),
    })),

  newAgent: () => set({ currentAgent: createEmptyAgent(), selectedNodeId: null }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  setChatLoading: (chatLoading) => set({ chatLoading }),

  clearChat: () => set({ chatMessages: [] }),

  addNodeFromToolbox: (item, position) => {
    const node: AgentNode = {
      id: uuidv4(),
      type: item.category,
      position,
      data: {
        label: item.name,
        category: item.category,
        description: item.description,
        icon: item.icon,
        color: item.color,
        config: { ...item.config },
        toolboxItemId: item.id,
      },
    };
    get().addNode(node);
  },
}));
