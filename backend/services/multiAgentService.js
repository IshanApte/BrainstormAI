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
      const graphResult = await runGraph(userMessage, conversationHistory);
      const allAgentResponses = graphResult.allResponses || [];
      const firstResponse = graphResult.firstResponse;

      if (!firstResponse || !firstResponse.content || allAgentResponses.length === 0) {
        console.error("LangGraph did not return any valid agent responses. Falling back.");
        // Fallback to a simple direct Storm call if graph fails catastrophically
        const storm = new StormAgent();
        const fallbackResponse = await storm.generateResponse(userMessage, conversationHistory);
        return {
          isMultiAgent: false,
          agents: [fallbackResponse],
          response: fallbackResponse.content
        };
      }
      
      return {
        isMultiAgent: allAgentResponses.length > 1,
        agents: allAgentResponses, // All agent responses for group chat display
        response: firstResponse.content // Primary response for backward compatibility
      };

    } catch (error) {
      console.error('Error in multiAgentService.generateResponse (LangGraph invocation):', error);
      // Critical fallback if runGraph itself throws an unhandled error
      try {
        console.log("Critical fallback: Directly using StormAgent due to graph error.");
        const storm = new StormAgent();
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

      const notePrompt = `Based on the following brainstorming conversation with multiple AI agents, extract and organize the content into THREE separate sections. Return ONLY a JSON object with three keys: "keyIdeas", "decisions", and "nextSteps". Each should be an array of bullet-point strings.

Format your response as valid JSON only, no markdown, no additional text:

{
  "keyIdeas": ["idea 1", "idea 2", ...],
  "decisions": ["decision 1", "decision 2", ...],
  "nextSteps": ["step 1", "step 2", ...]
}

Guidelines:
- **Key Ideas**: Capture the main concepts, creative thoughts, interesting solutions, and breakthrough insights discussed
- **Decisions**: Include any choices made, directions agreed upon, or conclusions reached
- **Next Steps**: List actionable items, tasks to explore, things to research, or follow-up activities

Keep each item concise but meaningful. If a category has no relevant content, return an empty array for that category.

Conversation:
${conversationText}

JSON Response:`;

      const response = await this.noteGenerationModel.call([
        new SystemMessage('You are a structured note-taker who extracts key information from brainstorming conversations and organizes it into three categories: Key Ideas, Decisions, and Next Steps. Always return valid JSON only.'),
        new HumanMessage(notePrompt)
      ]);

      // Parse the JSON response
      let parsedNotes;
      try {
        // Try to extract JSON from the response (in case it's wrapped in markdown or has extra text)
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedNotes = JSON.parse(jsonMatch[0]);
        } else {
          parsedNotes = JSON.parse(response.content);
        }
      } catch (parseError) {
        console.error('Error parsing notes JSON:', parseError);
        console.error('Response content:', response.content);
        // Fallback: create empty structure
        parsedNotes = {
          keyIdeas: [],
          decisions: [],
          nextSteps: []
        };
      }

      // Convert arrays to formatted markdown strings
      const formatNotes = (items) => {
        if (!items || items.length === 0) {
          return '*No items yet*';
        }
        // Clean up items that might already have bullet points
        const cleanedItems = items.flatMap(item => {
          // If an item contains bullet points (• or *), split it
          if (item.includes('•')) {
            return item.split('•').map(s => s.trim()).filter(s => s.length > 0);
          } else if (item.includes('*') && !item.startsWith('*No items')) {
            return item.split('*').map(s => s.trim()).filter(s => s.length > 0);
          }
          return [item.trim()];
        });
        
        // Format as proper markdown list with each item on its own line
        return cleanedItems.map(item => `- ${item}`).join('\n\n');
      };

      return {
        keyIdeas: formatNotes(parsedNotes.keyIdeas),
        decisions: formatNotes(parsedNotes.decisions),
        nextSteps: formatNotes(parsedNotes.nextSteps)
      };
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
