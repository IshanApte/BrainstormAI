const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage } = require('langchain/schema');

class BaseAgent {
  constructor(name, emoji, modelName = 'gpt-3.5-turbo', temperature = 0.7) {
    this.name = name;
    this.emoji = emoji;
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: modelName,
      temperature: temperature,
    });
  }

  getSystemPrompt() {
    throw new Error('Subclasses must implement getSystemPrompt()');
  }

  // New method to determine conversation stage and response guidelines
  getConversationStage(conversationHistory) {
    const messageCount = conversationHistory.length;
    
    if (messageCount <= 3) {
      return {
        stage: 'early',
        description: 'Early Conversation (1-3 exchanges)',
        guideline: 'Keep responses concise and focused (2-3 sentences max). Ask clarifying questions to gather context.',
        maxLength: 'short'
      };
    } else if (messageCount <= 6) {
      return {
        stage: 'mid',
        description: 'Mid Conversation (4-6 exchanges)',
        guideline: 'Provide more detailed responses (1-2 short paragraphs). Build on established context and explore ideas deeper.',
        maxLength: 'medium'
      };
    } else {
      return {
        stage: 'deep',
        description: 'Deep Conversation (7+ exchanges)',
        guideline: 'Offer comprehensive responses. Provide detailed analysis, multiple perspectives, and thorough exploration of topics.',
        maxLength: 'long'
      };
    }
  }

  // New method to inject stage-specific guidance into system prompt
  getStageSpecificSystemPrompt(conversationHistory) {
    const basePrompt = this.getSystemPrompt();
    const stageInfo = this.getConversationStage(conversationHistory);
    
    const stageGuidance = `

CONVERSATION STAGE: ${stageInfo.description}
RESPONSE LENGTH GUIDELINE: ${stageInfo.guideline}

IMPORTANT: Adapt your response length and depth to match this conversation stage. ${
  stageInfo.stage === 'early' 
    ? 'Start with short, focused responses that gather context and ask clarifying questions.' 
    : stageInfo.stage === 'mid' 
    ? 'Provide moderate detail as context builds. You can expand on ideas but stay focused.' 
    : 'Now you can give comprehensive, detailed responses with full analysis and multiple perspectives.'
}

CRITICAL: When responding, NEVER prefix your message with your name or any other agent's name (like "Storm:", "Sage:", etc.). Your name will be displayed automatically by the system. Start your response directly with your actual message content.`;

    return `${basePrompt}${stageGuidance}`;
  }

  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // Use stage-specific system prompt instead of base prompt
      const systemPrompt = this.getStageSpecificSystemPrompt(conversationHistory);
      const stageInfo = this.getConversationStage(conversationHistory);
      
      // Log conversation stage for debugging
      console.log(`${this.name} responding at ${stageInfo.stage} stage (${conversationHistory.length} messages)`);
      
      const messages = [
        new SystemMessage(systemPrompt),
        ...conversationHistory.map(msg => {
          if (msg.role === 'user') {
            return new HumanMessage(msg.content);
          } else if (msg.agents) {
            // Handle multi-agent messages by combining them
            const combinedContent = msg.agents.map(agent => 
              `${agent.name}: ${agent.content}`
            ).join('\n\n');
            return new AIMessage(combinedContent);
          } else {
            return new AIMessage(msg.content);
          }
        }),
        new HumanMessage(userMessage)
      ];

      const response = await this.model.call(messages);
      
      // Strip out any accidental agent name prefixes (Storm:, Sage:, Visionary:, Devil's Advocate:, etc.)
      let cleanedContent = response.content;
      const agentNamePrefixPattern = /^(Storm|Sage|Visionary|Devil'?s?\s*Advocate):\s*/i;
      cleanedContent = cleanedContent.replace(agentNamePrefixPattern, '');
      
      return {
        name: this.name,
        emoji: this.emoji,
        content: cleanedContent,
        conversationStage: stageInfo.stage // Include stage info in response
      };
    } catch (error) {
      console.error(`Error generating ${this.name} response:`, error);
      throw new Error(`Failed to generate ${this.name} response`);
    }
  }

  shouldParticipate(userMessage, conversationHistory = []) {
    // Default implementation - can be overridden by specific agents
    return true;
  }
}

module.exports = BaseAgent; 