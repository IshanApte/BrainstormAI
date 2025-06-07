const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, AIMessage, SystemMessage } = require('langchain/schema');
const { runGraph } = require('./graphOrchestrator'); // Import runGraph

// Import BaseAgent only if getAgentInfo needs it, or if agents are still needed for other methods.
// For now, assume graphOrchestrator handles agent instantiation for generateResponse.
const BaseAgent = require('./agents/BaseAgent'); 
// To get agent info, we might need to instantiate them here or have a static way
const StormAgent = require('./agents/StormAgent');
const SageAgent = require('./agents/SageAgent');
const VisionaryAgent = require('./agents/VisionaryAgent');
const DevilsAdvocateAgent = require('./agents/DevilsAdvocateAgent');

class MultiAgentService {
  constructor() {
    // Agents are instantiated within graphOrchestrator now for the main flow.
    // Keep them here if other methods like getAgentInfo need them directly.
    this.agentsForInfo = {
      storm: new StormAgent(),
      sage: new SageAgent(),
      visionary: new VisionaryAgent(),
      devilsAdvocate: new DevilsAdvocateAgent()
    };
    
    this.noteGenerationModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3,
    });
  }
  // getConversationStage might be deprecated if graph handles this implicitly or explicitly
  /* getConversationStage(conversationHistory) { ... } */

  async generateResponse(userMessage, conversationHistory = []) {
    console.log("MultiAgentService: Delegating to LangGraph orchestrator.");
    try {
      const agentResponse = await runGraph(userMessage, conversationHistory);

      if (!agentResponse || !agentResponse.content) {
        console.error("LangGraph did not return a valid agent response. Falling back.");
        // Fallback to a simple direct Storm call if graph fails catastrophically
        // This is a safety net and ideally shouldn't be hit if graph error handling is robust.
        const storm = new StormAgent();
        const fallbackResponse = await storm.generateResponse(userMessage, conversationHistory);
        return {
          isMultiAgent: true, // Or false, depending on how you want to represent this fallback
          agents: [fallbackResponse],
          response: fallbackResponse.content
        };
      }
      
      // The runGraph now returns the full response object of the last speaking agent
      return {
        isMultiAgent: true, // true because multiple agents are managed by the graph
        agents: [agentResponse], // The graph ensures only one agent "speaks" per turn to the user
        response: agentResponse.content
      };

    } catch (error) {
      console.error('Error in multiAgentService.generateResponse (LangGraph invocation):', error);
      // Critical fallback if runGraph itself throws an unhandled error
      try {
        console.log("Critical fallback: Directly using StormAgent due to graph error.");
        const storm = new StormAgent(); // Instantiate storm directly
        const stormResponse = await storm.generateResponse(userMessage, conversationHistory);
        return {
          isMultiAgent: false,
          agents: [stormResponse],
          response: stormResponse.content
        };
      } catch (fallbackError) {
        console.error('Critical fallback error (StormAgent direct call):', fallbackError);
        throw new Error('Failed to generate response from any agent or graph.');
      }
    }
  }

  // generateNotes and suggestFollowUpQuestions can remain as they are for now,
  // as they operate on the conversationHistory which will be correctly populated.

  async generateNotes(conversationHistory) {
    try {
      const conversationText = conversationHistory
        .map(msg => {
          if (msg.role === 'user') {
            return `User: ${msg.content}`;
          // Check if AIMessage has a name property (set by graphOrchestrator)
          } else if (msg.name && msg.role === 'ai') { 
            return `${msg.name}: ${msg.content}`;
          } else if (msg.agents) { // Legacy format, try to handle
            return msg.agents.map(agent => `${agent.name}: ${agent.content}`).join('\n');
          } else if (msg.role === 'assistant' || msg.role === 'ai') { // General AI message
             // Attempt to find agent name if it was stored differently
             const agentName = msg.name || 'Assistant';
             return `${agentName}: ${msg.content}`;
          } else {
            return `Assistant: ${msg.content}`; // Fallback for old format
          }
        })
        .join('\n');

      const participatingAgents = new Set();
      conversationHistory.forEach(msg => {
        if (msg.name && msg.role === 'ai') {
            participatingAgents.add(msg.name);
        } else if (msg.agents) { // Legacy
          msg.agents.forEach(agent => participatingAgents.add(agent.name));
        } else if (msg.role === 'ai' || msg.role === 'assistant') {
            participatingAgents.add(msg.name || 'Assistant');
        }
      });
      const uniqueAgentNames = Array.from(participatingAgents).filter(name => name !== 'ErrorAgent' && name !== 'Error');

      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });
      
      const whoWasHere = uniqueAgentNames.length > 0 ? `You + ${uniqueAgentNames.join(', ')}` : 'You + The AI Team';

      const notePrompt = `Based on the following brainstorming conversation with multiple AI agents, create friendly and casual session notes in bullet-point format. Keep it organized but relaxed in tone.

**💭 Brainstorm Session Notes**
• Date: ${currentDate}
• Who was here: ${whoWasHere}
• What we did: Creative brainstorming session

**🎯 What we talked about:**
• [Main topics and ideas we explored]

**💡 Cool ideas we came up with:**
• [Fun and creative concepts discussed]
• [Interesting solutions and approaches]
• [Wild ideas that came up]

**🤔 What the team thought (if different voices were clear):**
• [Key contributions or perspectives from different agents, if discernible]

**✅ Things we decided:**
• [Any choices or directions we settled on]
• [Stuff we agreed on]

**📝 Things to do next:**
• [Fun tasks to try out]
• [Next steps to explore]
• [Things to research or look into]

**❓ Questions we're still wondering about:**
• [Stuff we want to figure out later]
• [Things that need more thinking]

**🌟 Best bits from today:**
• [Coolest insights and breakthroughs]
• [Most exciting discoveries]
• [Key things to remember]

Extract the relevant info from our conversation below and organize it into this casual, friendly bullet-point format. Keep it fun and approachable while still being helpful! If specific agent names are not clear in the transcript, refer to them generally as 'the AI team' or similar.

Conversation:
${conversationText}

Session Notes:`;

      const response = await this.noteGenerationModel.call([
        new SystemMessage('You are a friendly note-taker who creates casual, approachable session notes from brainstorming conversations. Use a warm, informal tone that works for both professional and personal projects like birthday parties, weekend activities, or creative endeavors.'),
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
        .map(msg => {
          if (msg.role === 'user') {
            return `User: ${msg.content}`;
          } else if (msg.name && msg.role === 'ai') { 
            return `${msg.name}: ${msg.content}`;
          } else if (msg.agents) { // Legacy format
            return msg.agents.map(agent => `${agent.name}: ${agent.content}`).join('\n');
          } else if (msg.role === 'assistant' || msg.role === 'ai') {
             const agentName = msg.name || 'Assistant';
             return `${agentName}: ${msg.content}`;
          } else {
            return `Assistant: ${msg.content}`;
          }
        })
        .join('\n');

      const prompt = `Based on this brainstorming conversation context with multiple AI agents and the user's latest message, suggest 2-3 thoughtful follow-up questions that would help deepen the exploration of their ideas.

      Context:
      ${context}
      
      Latest message: ${userMessage}
      
      Suggest questions that are:
      1. Open-ended and thought-provoking
      2. Help explore different angles or perspectives
      3. Encourage deeper thinking about the topic
      4. Consider both creative and practical aspects
      
      Format as a simple list of questions.`;

      const response = await this.noteGenerationModel.call([
        new SystemMessage('You are a brainstorming facilitator who asks insightful questions based on multi-agent conversations.'),
        new HumanMessage(prompt)
      ]);

      return response.content;
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return null;
    }
  }

  getAgentInfo() {
    // Use agentsForInfo for this method
    return Object.values(this.agentsForInfo).map(agent => ({
      name: agent.name,
      emoji: agent.emoji
    }));
  }
}

module.exports = new MultiAgentService(); 
