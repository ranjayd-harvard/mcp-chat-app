export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  isLoading?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPServer {
  name: string;
  url: string;
  tools: MCPTool[];
  status: 'connected' | 'disconnected' | 'error';
}

export type ToolSource = 'all' | 'product' | 'external' | 'kafka' | 'sql' | 'custom';

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  availableTools: MCPTool[];
}
