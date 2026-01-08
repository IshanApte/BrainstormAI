import axios from 'axios';
import { ChatResponse, Session, Note, Feedback, ApiError, AgentInfo } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const chatApi = {
  sendMessage: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await api.post('/chat', { message, sessionId });
    return response.data;
  },

  getSession: async (sessionId: string): Promise<Session> => {
    const response = await api.get(`/chat/${sessionId}`);
    return response.data;
  },

  updateSession: async (sessionId: string, updates: Partial<Session>): Promise<Session> => {
    const response = await api.put(`/chat/${sessionId}`, updates);
    return response.data;
  },

  getAllSessions: async (): Promise<Session[]> => {
    const response = await api.get('/chat');
    return response.data;
  },

  getAgents: async (): Promise<AgentInfo[]> => {
    const response = await api.get('/chat/agents');
    return response.data;
  },
};

export const notesApi = {
  getNotes: async (sessionId: string): Promise<Note[]> => {
    const response = await api.get(`/notes/${sessionId}`);
    return response.data;
  },

  updateNote: async (noteId: string, content: string, category?: string, tags?: string[]): Promise<Note> => {
    const response = await api.put(`/notes/${noteId}`, { content, category, tags });
    return response.data;
  },

  deleteNote: async (noteId: string): Promise<void> => {
    await api.delete(`/notes/${noteId}`);
  },

  createNote: async (sessionId: string, content: string, category?: string, tags?: string[]): Promise<Note> => {
    const response = await api.post('/notes', { sessionId, content, category, tags });
    return response.data;
  },

  getAllNotes: async (category?: string, tag?: string, limit?: number): Promise<Note[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (tag) params.append('tag', tag);
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get(`/notes?${params.toString()}`);
    return response.data;
  },
};

export const feedbackApi = {
  submitFeedback: async (
    sessionId: string,
    messageIndex: number,
    rating: 'thumbs_up' | 'thumbs_down',
    comment?: string
  ): Promise<Feedback> => {
    const response = await api.post('/feedback', {
      sessionId,
      messageIndex,
      rating,
      comment,
    });
    return response.data;
  },

  getFeedback: async (sessionId: string): Promise<Feedback[]> => {
    const response = await api.get(`/feedback/${sessionId}`);
    return response.data;
  },

  getAllFeedback: async (rating?: string, limit?: number): Promise<{ feedback: Feedback[]; stats: any[] }> => {
    const params = new URLSearchParams();
    if (rating) params.append('rating', rating);
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get(`/feedback?${params.toString()}`);
    return response.data;
  },
};

export const healthApi = {
  checkHealth: async (): Promise<{ status: string; timestamp: string; environment: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api; 