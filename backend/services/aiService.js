const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage } = require('langchain/schema');
const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');

class AIService {
  constructor() {
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4',
      temperature: 0.7,
    });
    
    this.noteGenerationModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3,
    });
  }

  async generateResponse(userMessage, conversationHistory = []) {
    try {
      const systemPrompt = `You are Storm, a friendly and energetic AI brainstorming companion. Your personality is:
      - Enthusiastic and encouraging about ideas
      - Creative and thinks outside the box
      - Asks thoughtful follow-up questions
      - Helps users explore different angles and perspectives
      - Supportive of wild ideas and unconventional thinking
      - Practical when it comes to implementation

      Your role is to:
      1. Help users explore and develop their ideas through thoughtful questions and suggestions
      2. Encourage creative thinking and provide diverse perspectives
      3. Ask follow-up questions to deepen the conversation and uncover new insights
      4. Be supportive and enthusiastic about the user's ideas, even if they seem unusual
      5. Provide practical suggestions when appropriate
      6. Help break down complex problems into manageable parts
      
      Keep responses conversational, engaging, and focused on helping the user think through their ideas. Use your energetic personality to make brainstorming fun and productive!`;

      const messages = [
        new SystemMessage(systemPrompt),
        ...conversationHistory.map(msg => 
          msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        ),
        new HumanMessage(userMessage)
      ];

      const response = await this.model.call(messages);
      return response.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateNotes(conversationHistory) {
    try {
      const conversationText = conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const notePrompt = `Based on the following brainstorming conversation, extract the key ideas, insights, and action items into concise, well-organized notes. Focus on:
      1. Main ideas discussed
      2. Key insights or breakthroughs
      3. Action items or next steps
      4. Important questions raised
      
      Format the notes as clear, bullet-pointed items that capture the essence of the brainstorming session.
      
      Conversation:
      ${conversationText}
      
      Notes:`;

      const response = await this.noteGenerationModel.call([
        new SystemMessage('You are an expert note-taker who extracts key points from brainstorming conversations.'),
        new HumanMessage(notePrompt)
      ]);

      return response.content;
    } catch (error) {
      console.error('Error generating notes:', error);
      throw new Error('Failed to generate notes');
    }
  }

  async suggestFollowUpQuestions(userMessage, conversationHistory = []) {
    try {
      const context = conversationHistory
        .slice(-3) // Last 3 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = `Based on this brainstorming conversation context and the user's latest message, suggest 2-3 thoughtful follow-up questions that would help deepen the exploration of their ideas.

      Context:
      ${context}
      
      Latest message: ${userMessage}
      
      Suggest questions that are:
      1. Open-ended and thought-provoking
      2. Help explore different angles or perspectives
      3. Encourage deeper thinking about the topic
      
      Format as a simple list of questions.`;

      const response = await this.noteGenerationModel.call([
        new SystemMessage('You are a brainstorming facilitator who asks insightful questions.'),
        new HumanMessage(prompt)
      ]);

      return response.content;
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return null;
    }
  }
}

module.exports = new AIService(); 