import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatApi } from '../services/api';
import { Message, ChatResponse, AgentResponse } from '../types';

interface ChatInterfaceProps {
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  onNotesGenerated?: (notes: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  onSessionCreated,
  messages,
  onMessagesUpdate,
  onNotesGenerated,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterPrompts = [
    "Help me plan my nephew's first birthday party—theme ideas, activities, food, and a timeline for the day.",
    "Help me brainstorm a short story about someone who finds a letter from their past self.",
    "I need a thoughtful gift for my dad who 'has everything' and loves golf and history.",
    "I'm trying to decide whether to adopt a dog. Ask me the right questions to figure it out.",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      loadConversationHistory();
    }
  }, [sessionId]);

  const loadConversationHistory = async () => {
    if (!sessionId) return;
    try {
      const sessionData = await chatApi.getSession(sessionId);
      if (sessionData.messages && sessionData.messages.length > 0) {
        onMessagesUpdate(sessionData.messages);
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
    }
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageToSend = messageOverride || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage = messageToSend;
    setInputMessage('');
    setIsLoading(true);

    // Add user message to local state immediately
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newUserMessage];
    onMessagesUpdate(updatedMessages);

    try {
      const response: ChatResponse = await chatApi.sendMessage(userMessage, sessionId || undefined);
      
      // If this is a new session, update the session ID
      if (response.isNewSession) {
        onSessionCreated(response.sessionId);
      }

      // Add AI response to messages (handling both single and multi-agent responses)
      const aiMessage: Message = {
        role: 'assistant',
        content: response.response,
        agents: response.agents,
        timestamp: new Date(),
      };

      onMessagesUpdate([...updatedMessages, aiMessage]);

      // Handle auto-generated notes if present
      if (response.notes && onNotesGenerated) {
        console.log('📝 Chat: Auto-generated notes received, triggering callback');
        onNotesGenerated(response.notes);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove the user message if the request failed
      onMessagesUpdate(messages);
      const errorMessage = error?.response?.status === 404 || error?.code === 'ERR_NETWORK'
        ? 'Backend API not found. Please ensure the backend is deployed and REACT_APP_API_URL is configured correctly.'
        : error?.response?.data?.error || error?.message || 'Failed to send message. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStarterClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const getAgentColor = (agentName: string) => {
    const colors: { [key: string]: { border: string; bg: string; text: string } } = {
      'Storm': { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
      'Sage': { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-700' },
      'Devil\'s Advocate': { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700' },
      'Visionary': { border: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    };
    return colors[agentName] || { border: 'border-gray-400', bg: 'bg-gray-50', text: 'text-gray-700' };
  };

  const renderAgentResponse = (agent: AgentResponse, index: number) => {
    // Strip agent name prefix from content if present (e.g., "Storm:" or "Storm: ")
    let cleanContent = agent.content;
    const namePrefix = new RegExp(`^${agent.name}:\\s*`, 'i');
    if (namePrefix.test(cleanContent)) {
      cleanContent = cleanContent.replace(namePrefix, '').trim();
    }
    
    const colors = getAgentColor(agent.name);
    
    return (
      <div key={`${agent.name}-${index}`} className={`mb-2 p-3 rounded-lg ${colors.bg} border-l-4 ${colors.border} shadow-sm`}>
        {/* Agent label with color */}
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${colors.border} ${colors.bg} ${colors.text} text-xs font-semibold mb-2`}>
          <span>{agent.name}</span>
        </div>
        {/* Message content */}
        <div className="prose prose-sm max-w-none text-sm text-gray-800">
          <ReactMarkdown>{cleanContent}</ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome strip - only shown for first-time users */}
        {messages.length === 0 && (
          <>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-xs text-gray-500 text-center">
                Brainstorm with 4 perspectives and capture Key Ideas, Decisions, and Next Steps in Notes
              </p>
            </div>
            {/* Personality Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Storm */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-gray-900">Storm</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Enthusiastic and creative, encourages wild ideas and asks thoughtful questions to explore different angles.
                </p>
              </div>
              {/* Sage */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-gray-900">Sage</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Wise and analytical, asks critical questions about feasibility and helps turn ideas into actionable plans.
                </p>
              </div>
              {/* Devil's Advocate */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-gray-900">Devil's Advocate</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Constructively challenges ideas, identifies risks and blind spots to make concepts stronger and more robust.
                </p>
              </div>
              {/* Visionary */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-gray-900">Visionary</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ambitious and forward-thinking, encourages big-picture ideas and focuses on long-term potential and impact.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl ${
                message.role === 'user' ? 'message-user' : ''
              }`}
            >
              {message.role === 'user' ? (
                <div className="prose prose-sm max-w-none text-sm text-gray-700">
                  <p className="mb-0">{message.content}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {message.agents && message.agents.length > 0 ? (
                    // Display all agent responses for group chat feel
                    message.agents.map((agent, idx) => renderAgentResponse(agent, idx))
                  ) : (
                    // Single agent response (backward compatibility)
                    <div className="message-assistant">
                      <div className="prose prose-sm max-w-none text-sm text-gray-700">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="message-assistant max-w-2xl">
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {/* Starter Cards - shown when no messages */}
        {messages.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {starterPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleStarterClick(prompt)}
                className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-xs text-gray-600 leading-relaxed"
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share your idea or ask a question..."
            className="input-field resize-none text-sm placeholder:text-xs placeholder:text-gray-400"
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary self-end flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 
