export interface AgentResponse {
  name: string;
  emoji: string;
  content: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agents?: AgentResponse[]; // For multi-agent responses
}

export interface Session {
  sessionId: string;
  title: string;
  category: string;
  tags: string[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  _id: string;
  sessionId: string;
  content: string;
  category: string;
  tags: string[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  _id: string;
  sessionId: string;
  messageIndex: number;
  rating: 'thumbs_up' | 'thumbs_down';
  comment: string;
  createdAt: Date;
}

export interface ChatResponse {
  sessionId: string;
  response: string;
  agents?: AgentResponse[]; // Multi-agent responses
  isMultiAgent?: boolean; // Whether multiple agents responded
  messageIndex: number;
  notes: string | null;
  isNewSession: boolean;
}

export interface AgentInfo {
  name: string;
  emoji: string;
}

export interface ApiError {
  error: string;
  details?: string;
} 