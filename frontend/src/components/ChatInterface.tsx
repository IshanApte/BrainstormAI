import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Smile, Laugh, Angry, Sparkles, Plus } from 'lucide-react';
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
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
    // Start transition animation
    setIsTransitioning(true);
    // Wait for fade-out animation to complete before sending message
    setTimeout(() => {
      handleSendMessage(prompt);
      setIsTransitioning(false);
    }, 300); // Match the fade-out duration
  };

  const getAgentColor = (agentName: string) => {
    const colors: { [key: string]: { border: string; bg: string; text: string } } = {
      'Storm': { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
      'Sage': { border: 'border-green-400', bg: 'bg-green-50', text: 'text-green-700' },
      'Devil\'s Advocate': { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700' },
      'Visionary': { border: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    };
    return colors[agentName] || { border: 'border-gray-400', bg: 'bg-gray-50', text: 'text-gray-700' };
  };

  const getAgentIcon = (agentName: string, fallbackEmoji?: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'Storm': <Laugh className="text-blue-600" size={20} />,
      'Sage': <Smile className="text-green-600" size={20} />,
      'Devil\'s Advocate': <Angry className="text-red-600" size={20} />,
      'Visionary': <Sparkles className="text-yellow-600" size={20} />,
    };
    return iconMap[agentName] || (fallbackEmoji ? <span className="text-base">{fallbackEmoji}</span> : null);
  };

  const renderAgentResponse = (agent: AgentResponse, index: number) => {
    // Strip agent name prefix from content if present (e.g., "Storm:" or "Storm: ")
    let cleanContent = agent.content;
    const namePrefix = new RegExp(`^${agent.name}:\\s*`, 'i');
    if (namePrefix.test(cleanContent)) {
      cleanContent = cleanContent.replace(namePrefix, '').trim();
    }
    
    return (
      <div key={`${agent.name}-${index}`} className="mb-2 p-3 bg-gray-50 rounded-lg">
        {/* Agent name with icon */}
        <div className="flex items-center gap-2 mb-2">
          {getAgentIcon(agent.name, agent.emoji)}
          <span className="font-semibold text-sm text-gray-900">{agent.name}</span>
        </div>
        {/* Message content */}
        <div className="prose prose-sm max-w-none text-sm text-gray-800">
          <ReactMarkdown>{cleanContent}</ReactMarkdown>
        </div>
      </div>
    );
  };

  // Get user initial for avatar
  const getUserInitial = () => {
    // Default to 'Y' if we don't have user info - in a real app you'd get this from user context
    return 'Y';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome strip - only shown for first-time users */}
        {(messages.length === 0 || isTransitioning) && (
          <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {/* Title - prominent at the top */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">
                Brainstorm with 4 advisors and capture Key Ideas, Decisions, and Next Steps in Notes
              </h1>
            </div>
            {/* Personality Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Storm */}
              <div className="p-4 bg-white border border-blue-300/75 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Laugh className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Storm</h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Enthusiastic and creative, encourages wild ideas and asks thoughtful questions to explore different angles.
                </p>
              </div>
              {/* Sage */}
              <div className="p-4 bg-white border border-green-300/75 rounded-2xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Smile className="text-green-600" size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Sage</h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Wise and analytical, asks critical questions about feasibility and helps turn ideas into actionable plans.
                </p>
              </div>
              {/* Devil's Advocate */}
              <div className="p-4 bg-white border border-red-300/75 rounded-2xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Angry className="text-red-600" size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Devil's Advocate</h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Constructively challenges ideas, identifies risks and blind spots to make concepts stronger and more robust.
                </p>
              </div>
              {/* Visionary */}
              <div className="p-4 bg-white border border-yellow-300/75 rounded-2xl animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Sparkles className="text-yellow-600" size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Visionary</h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Ambitious and forward-thinking, encourages big-picture ideas and focuses on long term potential.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {message.role === 'user' ? (
              <>
                {/* User message bubble */}
                <div className="max-w-2xl bg-[#e6f4ea] rounded-2xl px-4 py-3">
                  <div className="prose prose-sm max-w-none text-sm text-gray-900">
                    <p className="mb-0">{message.content}</p>
                  </div>
                </div>
                {/* User avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getUserInitial()}</span>
                </div>
              </>
            ) : (
              <>
                <div className="max-w-2xl space-y-2">
                  {message.agents && message.agents.length > 0 ? (
                    // Display all agent responses for group chat feel
                    message.agents.map((agent, idx) => renderAgentResponse(agent, idx))
                  ) : (
                    // Single agent response (backward compatibility)
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="prose prose-sm max-w-none text-sm text-gray-800">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start items-start gap-3">
            <div className="max-w-2xl p-3 bg-gray-50 rounded-lg">
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
        {(messages.length === 0 || isTransitioning) && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {starterPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleStarterClick(prompt)}
                className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-xs text-gray-600 leading-relaxed animate-fade-in-up"
                style={{ animationDelay: `${400 + index * 100}ms` }}
                disabled={isLoading || isTransitioning}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div 
          className="flex items-center gap-3 bg-white rounded-lg px-4 py-6 shadow-lg border-2 transition-all duration-200"
          style={{
            borderColor: isInputFocused ? '#056a0b' : 'transparent',
            boxShadow: isInputFocused 
              ? '0 0 0 4px rgba(5, 106, 11, 0.1), 0 0 20px rgba(5, 106, 11, 0.2)' 
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Share your idea or ask a question....."
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[#9ca3af] text-gray-900"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="flex items-center gap-2 bg-transparent border-none outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-sm font-semibold text-gray-900"
          >
            <Sparkles size={16} className="text-[#056A0B]" />
            <span>Ask</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 
